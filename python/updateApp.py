#!/usr/bin/env python3

'''
This script makes adjustments to index.html and 
barChart.js/barChart.min.js based on new data.

index.html
  - updates the options (years) for the select element with id 'date-val'

barChart.js/barChart.min.js
  - updates yearCurrent variable to be most recent year there is data for
  - sets maxes for y scales in bar charts (yMaxTotal and yMaxYTD variables)

Required packages:
  - pandas 
'''

import re
import pandas as pd
import math
import os

# path to root directory (WilmingtonShootings)
path_root = os.path.dirname(os.path.realpath(__file__))[:-len('python')] + '/'

# path to data subdirectory
path_data = path_root + 'data/'

# get year for most recent data (yearCurrent)
yearly_data = pd.read_csv(path_data + 'yearlyData.csv')
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
        
select_element = "<select id='date-val'>\n"+html+"</select>"

# update select element in index.html
with open(path_root + 'index.html', 'r+') as f:
    index = f.read()
    # get old select element
    select_element_old = re.search('<select[^(date-type)]*?id= *["\']date-year["\'].*?</select>', index, re.DOTALL).group(0)
    # whitespace for new select element
    whitespace = re.search('(?<=\n).*?(?='+ select_element_old+')', index).group(0)+ '\t'
    select_element = select_element.replace('\n', '\n' + whitespace)
    select_element = select_element.replace('\tEND', '')
    # replace old select element with new
    index = index.replace(select_element_old, select_element)
    f.seek(0)
    f.write(index)
    
##########################################
### update barChart.js/barChart.min.js ###
##########################################

# yMaxTotal
totals = yearly_data.T.iloc[1:5,:]
max_totals = totals.max().max()
y_max_totals = math.ceil(max_totals)

# yMaxYTD
ytds = yearly_data.T.iloc[5:,:]
max_ytds = ytds.max().max()
y_max_ytds = math.ceil(max_ytds)
    
# write to file
files_path_in = os.listdir(path_root + 'js/')
files = ['barChart.js', 'barChart.min.js']
for file in files:    
    if file in files_path_in:
        with open(path_root + 'js/' + file, 'r+') as f:
            js = f.read()
            
            # set yearCurrent
            yearCurrent = re.search('yearCurrent *= *20[0-9][0-9]', js).group(0)
            js = js.replace(yearCurrent, 'yearCurrent = '+str(year_current))
            
            # set yMaxTotal
            yMaxTotal = re.search('yMaxTotal *= *[0-9]*', js).group(0)
            js = js.replace(yMaxTotal, 'yMaxTotal = '+str(y_max_totals))
            
            # set yMaxYTD
            yMaxYTD = re.search('yMaxYTD *= *[0-9]*', js).group(0)
            js = js.replace(yMaxYTD, 'yMaxYTD = '+str(y_max_ytds))
            
            f.seek(0)
            f.write(js)