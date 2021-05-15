#!/usr/bin/env python3

'''
This script adjusts y-axes in bar charts
according to the time of year and is 
to be run daily.

Required packages:
  - pandas 
'''

import re
import pandas as pd
import math
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

    # yMaxTotal
    totals = yearly_data.T.iloc[1:5,:]
    max_totals = totals.max().max()
    y_max_totals = math.ceil(max_totals)

    # yMaxYTD
    ytds = yearly_data.T.iloc[5:,:]
    max_ytds = ytds.max().max()
    y_max_ytds = math.ceil(max_ytds)
        
    # build
    if build:
        with open('js/barChart.js', 'r+') as f:
            js = f.read()

        # set yMaxTotal
        yMaxTotal = re.search('yMaxTotal *= *[0-9]*', js).group(0)
        js = js.replace(yMaxTotal, 'yMaxTotal='+str(y_max_totals))

        # set yMaxYTD
        yMaxYTD = re.search('yMaxYTD *= *[0-9]*', js).group(0)
        js = js.replace(yMaxYTD, 'yMaxYTD='+str(y_max_ytds))

        with open('js/barChart.js', 'r+') as f:
            f.seek(0)
            f.write(js)
            f.truncate()

    # s3
    else:
        key = prefix + '/js/barChart.js'
        js = get_object_s3(key)

        scales = re.findall('d3\.scaleLinear\(\)\.domain\(\[0,[0-9]*\]\)', js)
        js = js.replace(scales[0], 'd3.scaleLinear().domain([0,%s])' % y_max_totals)
        js = js.replace(scales[1], 'd3.scaleLinear().domain([0,%s])' % y_max_ytds)
    
        yMaxStatement = re.search('yMax=seriesNum<2\?[0-9]*:[0-9]*', js).group(0)
        js = js.replace(yMaxStatement, 'yMax=seriesNum<2?'+str(y_max_totals)+':'+str(y_max_ytds))

        bucket.put_object(Key=key, Body=js, ContentType='text/javascript')

    return {
        'message' : 'maxes for bar chart axes adjusted'
    }

if __name__ == '__main__':
  return_val = handler(1,1)
  print(return_val)