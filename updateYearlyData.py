#!/usr/bin/env python3

'''
This script scrapes yearly data from Wilmington Shootings website.
(https://data.delawareonline.com/utils/shootings.php)

Totals for incidents, homicide incidents, victims, and deaths are found
for year and year-to-date

Data is written to yearlyData.csv in path_out (set in config.py)

Required packages:
  - requests
  - bs4
  - pandas
'''

from config import path_out
import requests
from bs4 import BeautifulSoup
import pandas as pd

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
data_df.to_csv(path_out+'/yearlyData.csv', index = False)