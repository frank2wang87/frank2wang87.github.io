"""Refresh all-time Scholar metrics when the public totals change."""

import json
import os
import re
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener, urlopen


class NoRedirect(HTTPRedirectHandler):
    # Requests with an API key must stay on the configured API origin.
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class MetricsTable(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_table = False
        self.in_cell = False
        self.cells = []
        self.rows = []
        self.text = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'table' and attrs.get('id') == 'gsc_rsb_st':
            self.in_table = True
        if self.in_table and tag == 'tr':
            self.cells = []
        if self.in_table and tag == 'td' and 'gsc_rsb_std' in attrs.get('class', '').split():
            self.in_cell = True
            self.text = []

    def handle_data(self, data):
        if self.in_cell:
            self.text.append(data)

    def handle_endtag(self, tag):
        if tag == 'td' and self.in_cell:
            self.cells.append(''.join(self.text).strip())
            self.in_cell = False
        if tag == 'tr' and self.in_table and self.cells:
            self.rows.append(self.cells)
        if tag == 'table':
            self.in_table = False


def parse_metrics(html):
    table = MetricsTable()
    table.feed(html)
    if len(table.rows) != 3 or any(len(row) != 2 for row in table.rows):
        raise ValueError('Scholar statistics table is missing or has changed')
    values = []
    for row in table.rows:
        value = row[0]  # First column is all-time, second is recent years.
        if not re.fullmatch(r'[0-9][0-9,\s]*', value):
            raise ValueError('Scholar returned an invalid statistic')
        values.append(int(re.sub(r'[,\s]', '', value)))
    return validate_metrics(*values)


def validate_metrics(citations, h_index, i10_index):
    values = (citations, h_index, i10_index)
    if any(type(value) is not int or value < 0 for value in values):
        raise ValueError('Scholar returned an invalid statistic')
    if h_index > citations or i10_index * 10 > citations:
        raise ValueError('Scholar statistics are inconsistent')
    return dict(zip(('citations', 'hIndex', 'i10Index'), map(str, values)))


def fetch_serpapi_metrics(author, api_key):
    query = urlencode({
        'engine': 'google_scholar_author',
        'author_id': author,
        'hl': 'en',
        'no_cache': 'true',
        'api_key': api_key,
    })
    try:
        opener = build_opener(NoRedirect())
        with opener.open('https://serpapi.com/search.json?' + query, timeout=45) as response:
            result = json.load(response)
        if result['search_metadata']['status'] != 'Success' or result['search_parameters']['author_id'] != author:
            raise ValueError('Unexpected fallback result')
        totals = {name: values['all'] for row in result['cited_by']['table'] for name, values in row.items()}
        return validate_metrics(totals['citations'], totals['h_index'], totals['i10_index'])
    except Exception as error:
        # The request URL and provider messages can contain the API key.
        detail = f'HTTP {error.code}' if isinstance(error, HTTPError) else type(error).__name__
        raise ValueError(f'Scholar fallback failed ({detail})') from None


def fetch_metrics(scholar_url, api_key):
    url = urlparse(scholar_url)
    if url.scheme != 'https' or url.hostname != 'scholar.google.com':
        raise ValueError('Unexpected Scholar source')
    author = parse_qs(url.query).get('user', [''])[0]
    if not re.fullmatch(r'[A-Za-z0-9_-]+', author):
        raise ValueError('Missing Scholar author ID')
    if api_key:
        return fetch_serpapi_metrics(author, api_key), 'serpapi'

    request = Request(
        f'https://scholar.google.com/citations?user={author}&hl=en',
        headers={'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en'},
    )
    with urlopen(request, timeout=30) as response:
        return parse_metrics(response.read().decode('utf-8')), 'google-scholar'


def main():
    path = Path('profile.json')
    profile = json.loads(path.read_text(encoding='utf-8'))
    api_key = os.environ.get('SERPAPI_API_KEY', '').strip()
    try:
        metrics, source = fetch_metrics(profile['scholarUrl'], api_key)
    except Exception as error:
        print(f'::warning::Scholar sync failed; keeping last metrics: {error}')
        return 1

    previous = profile.get('metrics', {})
    if all(str(previous.get(name)) == value for name, value in metrics.items()):
        print(f"Scholar metrics unchanged: citations={metrics['citations']}, h-index={metrics['hIndex']}")
        return 0

    now = datetime.now(timezone.utc).isoformat(timespec='seconds')
    profile['metrics'] = {**previous, **metrics}
    profile['metricsSync'] = {
        'status': 'success',
        'attemptedAt': now,
        'succeededAt': now,
        'source': source,
        'error': '',
    }
    temporary = path.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(profile, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    temporary.replace(path)
    print(f"Scholar metrics updated: citations={metrics['citations']}, h-index={metrics['hIndex']}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
