'''
parse_date is called by updateIncidentData.py.

Input:
  - Date (string) of an incident scraped from Wilmingtong Shootings

Ouput:
  - List of two strings: ['YYYY', 'YYYY-MM-DD']
'''

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