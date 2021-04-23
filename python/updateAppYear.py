#!/usr/bin/env python3

'''
This script makes adjustments to index.html and 
barChart.js based on new data.

index.html
  - updates the options (years) for the select element with id 'date-val'

barChart.js
  - updates yearCurrent variable to be most recent year there is data for

Required packages:
  - pandas 
'''

import re
import pandas as pd
from utils import check_build, get_yearly_data

build = check_build()
if not build:
  import boto3
  import io
  from config import bucket_name, prefix, prefix_data
  from utils import get_object_s3
  s3 = boto3.resource('s3')
  bucket = s3.Bucket(bucket_name)

def handler(event, context):
  
  yearly_data = get_yearly_data(build)
  year_current = yearly_data.iloc[0,0]
  
  #########################
  ### update index.html ###
  #########################

  # base year
  year = 2011

  # build html for select element looping through years
  # from 2011 to current year
  html = ''
  while year <= year_current:
      y = str(year)
      # option element for each year
      if year != year_current:
          html += '<option value="'+y+'">'+y+'</option>\n'
      # most recent year is selected
      else:
          html += '<option value="'+y+'" selected="selected">'+y+'</option>\nEND'
      year += 1
          
  select_element = "<select id='date-year'>\n"+html+"</select>"

  # update select element in index.html
  if build:
    with open('index.html', 'r+') as f:
        index = f.read()
  else:
    key = 'wilmington-shootings'
    index = get_object_s3(key)

  # get old select element
  select_element_old = re.search('<select[^(date-type)]*?id= *["\']date-year["\'].*?</select>', index, re.DOTALL).group(0)
  # whitespace for new select element
  whitespace = re.search('(?<=\n).*?(?='+ select_element_old+')', index).group(0)+ '\t'
  select_element = select_element.replace('\n', '\n' + whitespace)
  select_element = select_element.replace('\tEND', '')
  # replace old select element with new
  index = index.replace(select_element_old, select_element)

  if build:
    with open('index.html', 'r+') as f:
      f.seek(0)
      f.write(index)
      f.truncate()
  else:
    bucket.put_object(Key=key, Body=index, ContentType='text/html')

  ##########################
  ### update barChart.js ###
  ##########################
      
  # local
  if build:
    with open('js/barChart.js', 'r+') as f:
      js = f.read()

    # set yearCurrent
    yearCurrent = re.search('yearCurrent *= *20[0-9][0-9]', js).group(0)
    js = js.replace(yearCurrent, 'yearCurrent='+str(year_current))

    with open('js/barChart.js', 'r+') as f:
      f.seek(0)
      f.write(js)
      f.truncate()

  # s3
  else:
    key = 'js/barChart.js'
    js = get_object_s3(key)

    # set yearCurrent
    yearCurrent = re.search('y<=20[0-9][0-9]', js).group(0)
    js = js.replace(yearCurrent, 'y<='+str(year_current))

    bucket.put_object(Key=key, Body=js, ContentType='text/javascript')
  
  return {
    'message' : 'app structure updated to reflect current year'
  }

if __name__ == '__main__':
  return_val = handler(1,1)
  print(return_val)