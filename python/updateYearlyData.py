#!/usr/bin/env python3

import os
import requests
from bs4 import BeautifulSoup
import pandas as pd
from utils import check_build

build = check_build()
if not build:  
  import boto3
  from config import bucket_name, prefix, prefix_data
  s3 = boto3.resource('s3')
  bucket = s3.Bucket(bucket_name)

def handler(event, context):

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

  file_name = 'yearlyData.csv'

  # write data to file
  if build:
    path_out = path_out = 'data/'+file_name
    data_df.to_csv(path_out, index = False)

  # write data to s3
  else:
    data_str = data_df.to_csv(index = False)
    key = prefix_data+'/'+file_name
    bucket.put_object(Key=key, Body=data_str, ContentType='text/csv')
  
  return {
    "message": "yearly data updated"
  }

if __name__ == '__main__':
  return_val = handler(1,1)
  print(return_val)