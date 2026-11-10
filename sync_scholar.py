"""Refresh all-time Scholar metrics, keeping the last snapshot on failure."""

import json
import re
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen


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
    citations, h_index, i10_index = values
    if h_index > citations or i10_index * 10 > citations:
        raise ValueError('Scholar statistics are inconsistent')
    return dict(zip(('citations', 'hIndex', 'i10Index'), map(str, values)))


def main():
    path = Path('profile.json')
    profile = json.loads(path.read_text(encoding='utf-8'))
    now = datetime.now(timezone.utc).isoformat(timespec='seconds')
    previous = profile.get('metricsSync', {})
    sync = {**previous, 'attemptedAt': now}
    try:
        source = profile['scholarUrl']
        url = urlparse(source)
        if url.scheme != 'https' or url.hostname != 'scholar.google.com':
            raise ValueError('Unexpected Scholar source')
        author = parse_qs(url.query).get('user', [''])[0]
        if not re.fullmatch(r'[A-Za-z0-9_-]+', author):
            raise ValueError('Missing Scholar author ID')
        request = Request(
            f'https://scholar.google.com/citations?user={author}&hl=en',
            headers={'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en'},
        )
        with urlopen(request, timeout=30) as response:
            metrics = parse_metrics(response.read().decode('utf-8'))
        profile['metrics'] = {**profile.get('metrics', {}), **metrics}
        sync.update(status='success', succeededAt=now, error='')
        print(f"Scholar metrics updated: citations={metrics['citations']}, h-index={metrics['hIndex']}")
    except Exception as error:
        sync.update(status='error', error=str(error))
        print(f'::warning::Scholar sync failed; keeping last metrics: {error}')
    profile['metricsSync'] = sync
    temporary = path.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(profile, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(path)
    return 0 if sync['status'] == 'success' else 1


if __name__ == '__main__':
    raise SystemExit(main())

