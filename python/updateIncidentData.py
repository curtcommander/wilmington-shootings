#!/usr/bin/env python3

'''
This script scrapes incident data from the Wilmington Shootings website.
(http://data.delawareonline.com/webapps/crime/)

html, lat, long, date, and year are found for each incident.
Files containing this data are outputted. Existing data files 
are updated or new data files are created and written to.

All data files are located in WilmingtonShootings/data/.

An API key is needed for the Google Maps Geocoding API.
This is set in config.py (string named google_maps_key).

Required packages:
  - requests
  - bs4
  - webd
  - pandas
'''

# get path to data subdirectory
import os
import requests
from bs4 import BeautifulSoup
import re
from parseDate import parse_date
import webd
from config import google_maps_key
import json
from time import sleep
import pandas as pd

# path to data subdirectory
path_data = os.path.dirname(os.path.realpath(__file__))[:-len('python')] + '/data/'

#############################################
### get old data and most recent incident ###
#############################################

# clear data_old_df and data_recent if rerunning script in IDE
if 'data_old_df' in globals():
    del data_old_df
if 'data_recent' in globals():
    del data_recent    

# list of files in data subdirectory
file_list = os.listdir(path_data)

# shootingsDataCurrent.csv exists
if 'incidentDataCurrent.csv' in file_list:
    data_old_current_df = pd.read_csv(path_data + 'incidentDataCurrent.csv')
    # data_old_current_df not empty
    if not data_old_current_df.empty:
        
        # data_old_df
        data_old_df = data_old_current_df
        
        # data_recent, round ensures 
        data_recent = list(data_old_current_df.iloc[0,2:5])
        # issue with float conversions being off when converting series to list
        for i in range(2):
            data_recent[i] = round(data_recent[i], 5)
             
# shootingsDataPrevious.csv exists
if 'incidentDataPrevious.csv' in file_list:
    data_old_previous_df = pd.read_csv(path_data + 'incidentDataPrevious.csv')
    
    # data_old_previous not empty
    if not data_old_previous_df.empty:
        
        # data_old_df
        # data_old_df exists, append data_old_previous_df to data_old_df
        if 'data_old_df' in globals() and not data_old_previous_df.empty:
            data_old_df = pd.concat([data_old_df, data_old_previous_df], ignore_index=True)
        # data_old_df doesn't exist
        else:
            data_old_df = data_old_previous_df
            
        # data_recent
        # data_recent not found in shootingsDataCurrent.csv
        if 'data_recent' not in globals():
            data_recent = list(data_old_previous_df.iloc[0,2:5])
            # issue with float conversions being off when converting series to list
            for i in range(2):
                data_recent[i] = round(data_recent[i], 5)
            
# no old data
# data_old_df
if 'data_old_df' not in globals():
    data_old_df = pd.DataFrame()
# data_recent
if 'data_recent' not in globals():
    data_recent = False

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
        global count_new_incidents
        count_new_incidents += 1
        
        # minify report html
        incident = webd.minify(str(incident))
            
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
        
        #coordinates found by API
        try:
            latlong = json_content['results'][0]['geometry']['location']
            lat = round(latlong['lat'],5)
            lng = round(latlong['lng'],5)
            coords_found = True
        # coordinates not found by API
        except:
            coords_found = False
            data_coords_not_found.append((location, date, incident))
            
        if coords_found:
            # append incident data to data_new
            if [lat, lng, date] != data_recent:
                data_new.append([year, incident, lat, lng, date])
            # data_recent reached, end loop            
            else:
                global data_recent_reached
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
        print('(data in data_coords_not_found)')
    
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
    data_current_df.to_csv(path_data + 'incidentDataCurrent.csv', index = False)
    
    # get previous data and write to shootingsDataPrevious.csv
    # previous data is all data before the current year
    data_previous_df = data_df.loc[data_df['YEAR'] != year_current]
    data_previous_df.to_csv(path_data + 'incidentDataPrevious.csv', index = False)
     
    # print number of new incidents added to data files
    print(str(len(data_new))+' new incidents added.')
