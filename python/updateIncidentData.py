#!/usr/bin/env python3

'''
This script scrapes incident data from the Wilmington Shootings website.
(http://data.delawareonline.com/webapps/crime/)

html, lat, long, date, and year are found for each incident.
Files containing this data are outputted. Existing data files 
are updated or new data files are created and written to.

All data files are located in wilmington-shootings/data/.

An API key is needed for the Google Maps Geocoding API.
This is set in config.py (string named google_maps_key).

Required packages:
  - requests
  - bs4
  - htmlmin
  - pandas
'''

import os
import requests
from bs4 import BeautifulSoup
import re
import htmlmin
from config import google_maps_key
import json
from time import sleep
import pandas as pd
from utils import check_build, parse_date

build = check_build()
if not build:
    import boto3
    import io
    from config import bucket_name, prefix, prefix_data
    from utils import get_object_s3

    s3 = boto3.resource('s3')
    bucket = s3.Bucket(bucket_name)

def handler(event, context):

    #############################################
    ### get old data and most recent incident ###
    #############################################

    data_old_df = pd.DataFrame()
    data_recent = False

    # list of files in data subdirectory
    if build:
        file_list = os.listdir('data')
    else:
        file_list = []
        s3_client = boto3.client('s3')
        for file in s3_client.list_objects(Bucket=bucket_name, Prefix=prefix_data)['Contents']:
            file_list.append(file['Key'].replace(prefix_data+'/',''))
        
    if 'incidentDataCurrent.csv' in file_list:
        # data_old_df
        if build:
            data_old_current_df = pd.read_csv('data/incidentDataCurrent.csv')
        else:
            key = prefix_data+'/incidentDataCurrent.csv'
            data_old_current = get_object_s3(key)
            data_old_current_df = pd.read_csv(io.StringIO(data_old_current))

        data_old_df = data_old_current_df

        # data_recent
        if not data_old_df.empty:
            data_recent = list(data_old_current_df.iloc[0,2:5])
            # issue with float conversions being off when converting series to list
            for i in range(2):
                data_recent[i] = round(data_recent[i], 5)
                
    if 'incidentDataPrevious.csv' in file_list:
        # data_old_df
        if build:
            data_old_previous_df = pd.read_csv('data/incidentDataPrevious.csv')
        else:
            key = prefix_data+'/incidentDataPrevious.csv'
            data_old_previous = get_object_s3(key)
            data_old_previous_df = pd.read_csv(io.StringIO(data_old_previous))
        
        data_old_df = pd.concat([data_old_df, data_old_previous_df], ignore_index=True)
            
        # data_recent
        if not data_old_previous_df.empty and not data_recent:        
            data_recent = list(data_old_previous_df.iloc[0,2:5])
            # issue with float conversions being off when converting series to list
            for i in range(2):
                data_recent[i] = round(data_recent[i], 5)
                
    #############################
    ### scrape and parse data ###
    #############################

    data_new = []
    data_coords_not_found = []
    data_recent_reached = False
    count_new_incidents = 0

    # get_data finds and parses data for each incident found at given url
    def get_data(url):
        response = requests.get(url)
        parsed_html = BeautifulSoup(response.content, 'html.parser')
        incidents = parsed_html.find_all('div', attrs = {'class' : 'incident'})
        for incident in incidents:
            nonlocal count_new_incidents
            count_new_incidents += 1
            
            # minify report html
            incident = htmlmin.minify(str(incident))
                
            # remove a element from h2
            a_tag_open = re.search('<a.*?>', incident).group(0)
            incident = incident.replace(a_tag_open, '')
            a_tag_close = '</a>'
            incident = incident.replace(a_tag_close, '')
            
            # parse date
            date_string = re.search('(?<=</span>).*?(?=<br)', incident).group(0)[1:]
            year, date = parse_date(date_string)
            
            # find location
            location = re.search('(?<=Location:</strong>).*?(?=<br)', incident).group(0)
            location = location.replace('In the area of ', '')
            
            # find lat and long from Google Geocoding API
            google_maps_url = 'https://maps.google.com/maps/api/geocode/json?sensor=false'+ \
                '&address=' + location + \
                '&key=' + google_maps_key
            response = requests.get(google_maps_url)
            json_content = json.loads(response.content)
            
            # API allows 50 requests per second 
            sleep(0.02)
            
            # coordinates not found by API
            if json_content['status'] == 'ZERO_RESULTS':
                data_coords_not_found.append((location, date, incident))

            #coordinates found by API
            else:
                latlong = json_content['results'][0]['geometry']['location']
                lat = round(latlong['lat'],5)
                lng = round(latlong['lng'],5)
                
                # append incident data to data_new
                if [lat, lng, date] != data_recent:
                    data_new.append([year, incident, lat, lng, date])
                # data_recent reached, end loop            
                else:
                    nonlocal data_recent_reached
                    data_recent_reached = True
                    break

    ##########################
    ### loop through pages ###
    ##########################

    # get number of pages
    base = 'http://data.delawareonline.com/webapps/crime/?time_frame=None&page='
    response = requests.get(base)
    num_pages = re.search('(?<=<span>Page )[0-9]* of [0-9]*(?=</span>)',response.text).group(0)
    num_pages = int(num_pages.split(' of ')[1])

    # scrape data looping through pages on site
    pages = range(1,num_pages+1)
    for page_num in pages:
        # data_recent not reached, keep loooping through pages
        if not data_recent_reached:
            url = base + str(page_num)
            get_data(url)
            # print progress
            print('\rCurrent page: '+str(page_num)+' of '+str(num_pages), end='\r')
        # data_recent reached
        else:
            print('\nEnd of new data reached.', end='\r')
            break
        
    ####################################
    ### format and save data to file ###
    ####################################
        
    # no new data
    if data_new == []:
        print('No new data to be added.')
    # new data to be added
    else:
        num_coords_not_found = len(data_coords_not_found)
        if num_coords_not_found == 0:
            print('\nCoordinates found for all new incidents.')
        else:
            print('\nCoordinates not found for '+str(num_coords_not_found)+
                ' of '+str(count_new_incidents)+' new incidents.')

        # format and combine new data with old data
        data_new_df = pd.DataFrame(data_new)
        data_new_df.columns = ['YEAR', 'HTML', 'LAT', 'LONG', 'DATE']
        data_df = data_new_df
        if not data_old_df.empty:
            data_df = pd.concat([data_df, data_old_df], ignore_index=True)
        
        # get current data and write to shootingsDataCurrent.csv
        # current data is all data for the current year
        year_current = data_df.iloc[0,0]
        data_current_df = data_df.loc[data_df['YEAR'] == year_current]
        if build:
            data_current_df.to_csv('data/incidentDataCurrent.csv', index = False)
        else:
            data_current_str = data_current_df.to_csv(index = False)
            bucket.put_object(Key=prefix_data+'/incidentDataCurrent.csv',
                Body=data_current_str, ContentType='text/csv')

        # get previous data and write to shootingsDataPrevious.csv
        # previous data is all data before the current year
        data_previous_df = data_df.loc[data_df['YEAR'] != year_current]
        if build:
            data_previous_df.to_csv('data/incidentDataPrevious.csv', index = False)
        else:
            data_previous_str = data_previous_df.to_csv(index = False)
            bucket.put_object(Key=prefix_data+'/incidentDataPrevious.csv',
                Body=data_previous_str, ContentType='text/csv')

        # print number of new incidents added to data files
        print(str(len(data_new))+' new incidents added.')

    return {
        "message": "incident data updated"
    }

if __name__ == '__main__':
    return_val = handler(1,1)
    print(return_val)