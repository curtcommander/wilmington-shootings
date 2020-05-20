#!/usr/bin/env python3

'''
This script scrapes yearly data from the Wilmington Shootings website.
(https://data.delawareonline.com/utils/shootings.php)

Totals for incidents, homicide incidents, victims, and deaths are found
for year and year-to-date.

Data is written to yearlyData.csv in WilmingtonShootings/data/.

Required packages:
  - requests
  - bs4
  - pandas
'''

import os
import requests
from bs4 import BeautifulSoup
import pandas as pd

# path to data subdirectory
path_data = os.path.dirname(os.path.realpath(__file__)) + '/data/'

# get and parse response
url = 'https://data.delawareonline.com/utils/shootings.php'
response = requests.get(url)
html = BeautifulSoup(response.content, 'html.parser').tbody

# parse data in table found at url
data = []
rows = html.find_all('tr')
for row in rows:
    vals = []
    tds = row.find_all('td')
    for td in tds:
        vals.append(td.string)
    data.append(vals)
    
# format data and write to yearlyData.csv
data_df = pd.DataFrame(data)
data_df.columns = ['year','incidents','homicideIncidents','victims','killed',
                'incidentsYTD', 'homicideIncidentsYTD','victimsYTD','killedYTD']
data_df.to_csv(path_data + 'yearlyData.csv', index = False)