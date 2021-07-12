def check_build():
  import sys
  if len(sys.argv) > 1:
    return sys.argv[1] == 'build'
  else:
    return False

def parse_date(date_string):
    import re

    # year
    year = re.findall(' 20[1-9][0-9], ',date_string)[0][1:-2]

    # month
    month_name = re.findall('.*?(?= )', date_string)[0].strip('.')
    month = month_name_to_number[month_name[:3]]

    # day
    day = re.findall('(?<= ).*?(?=,)',date_string)[0]
    if len(day) == 1:
        day = '0'+day
    
    # year must be int for comparison with old data
    # (years in old data are imported as numbers)
    return [int(year), year+'-'+month+'-'+day]

# dictionary to translate month name to number 
month_name_to_number = {
    'Jan' : '01',
    'Feb' : '02',
    'Mar' : '03',
    'Apr' : '04',
    'May' : '05',
    'Jun' : '06',
    'Jul' : '07',
    'Aug' : '08',
    'Sep' : '09', 
    'Oct' : '10',
    'Nov' : '11',
    'Dec' : '12',
}

def get_object_s3(key):
  import boto3
  from config import bucket_name
  s3 = boto3.resource('s3')
  return s3.Object(bucket_name, key).get()['Body'].read().decode('utf-8')

def get_yearly_data(build):
  import pandas as pd
  import io
  from config import prefix_data

  # get yearly data
  if build:
    return pd.read_csv('data/yearlyData.csv')
  else:
    key = prefix_data+'/yearlyData.csv'
    yearly_data_str = get_object_s3(key)
    return pd.read_csv(io.StringIO(yearly_data_str))
