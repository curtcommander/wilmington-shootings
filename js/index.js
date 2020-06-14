'use strict';

///////////
/// MAP ///
///////////

// map parameters
const center = L.latLng(39.7461, -75.5498);
const zoom = 14;
 
// base map
const map = L.map('map')
             .setView(center, zoom)
             .setMaxBounds(L.latLngBounds([[39.8261, -75.4698], [39.6661, -75.6298]]) 
);

// tiles
L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}{r}.{ext}', {
    attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>\n\
                 <div>Icons made by <a href="http://www.freepik.com" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a> is licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a></div>',
	minZoom: 13,
	maxZoom: 18,
	ext: 'png'
})
.addTo(map);

// ensure map loads properly
window.addEventListener('load', function() {
    map.invalidateSize();
})

/////////////
/// ICONS ///
/////////////

// initialize icons
const svgTemplate = L.Util.template(' \
<svg version="1.1" class="leaflet-data-marker" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 15.847 15.847" style="enable-background:new 0 0 15.847 15.847;" xml:space="preserve"> \
    <path d="M15.847,5.228V4.052h-0.065V2.931h-0.064V2.534H15.26V2.93c0,0-11.083,0.078-13.018,0 \
        c-0.296,0-1.986,0.167-0.291,2.773c0,0,0.77,1.168-0.285,2.471c-1.041,1.284-1.51,3.885-1.632,4.671H0v0.468h4.803v-0.468v-0.43 \
        c-2.075,0.382,1.434-4.447,1.278-3.634c0.113,0.029,0.23,0.047,0.352,0.047h1.25c0.772,0,1.797-0.826,1.797-1.599 \
        c0-0.335-0.118-0.642-0.314-0.883h6.185l0.2-0.736h0.262V5.254H15.77l0.011-0.026H15.847z M7.685,8.144h-1.25 \
        c-0.092,0-0.181-0.015-0.265-0.04c0.073-0.429,0.129-0.813,0.169-1.112c0.105,0.347,0.31,0.71,0.713,0.867 \
        C7.08,7.87,7.109,7.875,7.138,7.875c0.094,0,0.184-0.058,0.221-0.15c0.047-0.123-0.014-0.26-0.136-0.308 \
        c-0.417-0.162-0.5-0.792-0.516-1.068h1.205c0.393,0.102,0.686,0.459,0.686,0.883C8.598,7.734,8.188,8.144,7.685,8.144z \
        M14.098,5.612H7.924l1.072-0.357h5.102C14.098,5.255,14.098,5.612,14.098,5.612z"/> \
</svg>');
const icon = L.divIcon({
      className: "leaflet-data-marker",
      html: svgTemplate
})

// icon size
const mapElement = document.getElementById('map');

function getIconSize() {
    const mapStyles = window.getComputedStyle(mapElement);
    const mapWidth = parseFloat(mapStyles.getPropertyValue('width'));
    const mapHeight = parseFloat(mapStyles.getPropertyValue('height'));
    const vmin = Math.min(mapWidth, mapHeight);
    const currentZoom = map.getZoom();
    return 0.03*vmin + 1.2*currentZoom;
};

// adjust icon sizes and anchors
function adjustIcons() {
    // adjust size and anchor of existing icons
    const size = getIconSize();
    const sizeCSS = String(size) + 'px';
    const anchorCSS = size*-0.5+'px';
    document.querySelectorAll('.leaflet-marker-icon').forEach(function(marker) {
        // adjust size
        const svgStyle = marker.querySelector('svg').style;
        svgStyle.width = sizeCSS;
        svgStyle.height = sizeCSS;
        // adjust anchors to accomodate new size
        marker.style.marginLeft = anchorCSS;
        marker.style.marginTop = anchorCSS;
    })
    // change size of icon object, leaflet will automatically adjust icon anchor
    icon.options.iconSize = [size, size];
}
map.on('zoomstart', adjustIcons)
   .on('resize', adjustIcons)

/////////////////////////////////////
/// READ IN DATA AND INITIAL PLOT ///
/////////////////////////////////////

// plot data returned by loadCurrentData
const markers = L.layerGroup();
function plotCurrentData(currentData) {
    // set intial icon size by calling adjustIcons
    adjustIcons();
    for (let i = 0; i < currentData.length; i++) {
        const d = currentData[i];
        L.marker([d.LAT, d.LONG], {icon: icon})
            .on("click", markerClickHandler)
            .addTo(markers)
    }
    markers.addTo(map);
}

// prepare global data objects: dataYearly and dataChron
// dataYearly for yearly data (data keyed by year in descending chronological order)
// dataChron for custom date ranges (data in descending chronological order)

// initialize dataYearly
let dataYearly = {};
let yearDataYearly = 2011;
const yearCurrent = document.querySelector('#date-year option[selected="selected"]').value;
while (yearDataYearly <= yearCurrent) {
    dataYearly[yearDataYearly] = [];
    yearDataYearly++
}    

// iniatialize year, global variable (string) used to keep track of year selected
let year = yearCurrent;

// declare vars
var dataChron, dataYear;

function prepareDataObjects(currentData) {
    // add current data to dataChron and dataYearly
    dataChron = currentData;
    dataYear = dataYearly[year];
    for (let i = 0; i < dataChron.length; i++) {
        let d = dataChron[i];
        // remove year from dataChron
        delete d.YEAR;
        // add incident to dataYearly (year currently set to most recent year)
        dataYear.push({'LAT': d.LAT, 'LONG': d.LONG, 'HTML': d.HTML})
    }
    
    // load rest of data into dataYearly and dataChron
    d3.csv('data/incidentDataPrevious.csv').then(function(data) {            
        data.forEach(function(d) {
            // dataYearly
            dataYearly[d.YEAR].push({'LAT': d.LAT, 'LONG': d.LONG, 'HTML': d.HTML})
            // dataChron
            delete d.YEAR;
            dataChron.push(d);
        })
    })
    
}

// read in current data
d3.csv('data/incidentDataCurrent.csv')
.then(function(currentData) {
    // plot current data
    plotCurrentData(currentData);
    // populate objects with current and previous data
    prepareDataObjects(currentData);
})

////////////////////////
/// GLOBAL VARIABLES ///
////////////////////////

// variables necessary for initial plot are declared and initialized above as needed
// variables below are used throughout the rest of this script
// variable names are camel-cased element IDs (except for today)
const dateType = document.getElementById('date-type');
const dateYear = document.getElementById('date-year');
const dateCustom = document.getElementById('date-custom');
const dateCustomFrom = document.getElementById('date-custom-from');
const dateCustomTo = document.getElementById('date-custom-to');
const sidePanel = document.getElementById('side-panel');
const sidePanelDefault = document.getElementById('side-panel-default')
const barChart = document.getElementById('barChart');
const today = new Date();

////////////////////
/// PLOT MARKERS ///
////////////////////

// plot markers for year selected
function plotMarkersYear() {
    // clear old markers
    markers.clearLayers();
    // add new markers corresponding to year selected
    const dataYear = dataYearly[year];
    for (let i = 0; i < dataYear.length; i++) {
        L.marker([dataYear[i].LAT, dataYear[i].LONG], {icon: icon})
            .on("click", markerClickHandler)
            .addTo(markers)};
    markers.addTo(map);
}
// year change
dateYear.addEventListener('change', function() {
    year = this.value;
    plotMarkersYear();
})

// negates time zone offset when date object parsed from string
function adjustTimeZoneOffset(d) {
    return new Date(d.getTime() + d.getTimezoneOffset()*60000)
}

// plot markers for custom date range
function plotMarkersCustomDate() {
    // clear old markers
    markers.clearLayers();
    // add new markers that fall in date range selected
    const fromDate = adjustTimeZoneOffset(new Date(dateCustomFrom.value));
    const toDate = adjustTimeZoneOffset(new Date(dateCustomTo.value));
    // loop through dataChron (chronologically descending)
    for (let i = 0; i < dataChron.length; i++) {
        let d = dataChron[i];
        d.DATE = adjustTimeZoneOffset(new Date(d.DATE));
        if (d.DATE >= fromDate) {
            // date is in custom range, add marker
            if (d.DATE <= toDate) {
                L.marker([d.LAT, d.LONG],{icon: icon})
                    .on("click", markerClickHandler)
                    .addTo(markers)
            }
        // fromDate reached, break loop
        } else if (d.Date < fromDate) {
            break;
        }
    }
    markers.addTo(map);
};
// custom date change
dateCustomFrom.addEventListener('change', plotMarkersCustomDate);
dateCustomTo.addEventListener('change', plotMarkersCustomDate);

////////////////////
/// DATE PICKERS ///
////////////////////

// used to get today's date in format MM/DD/YYYY in toDateOptions
Date.prototype.formatMMDDYYYY = function() {
    return (this.getMonth()+1)+ "/"+this.getDate()+"/"+this.getFullYear();
}

const fromDateOptions = {
    dateFormat: 'm/d/Y',
    minDate: '01/01/2011',
    maxDate: null,
    defaultDate: null
}

const toDateOptions = {
    dateFormat: 'm/d/Y',
    minDate: null,
    maxDate: (new Date()).formatMMDDYYYY(),
    defaultDate: null
}

function updateDatePickers() {
    const fromDate = dateCustomFrom.value;
    const toDate = dateCustomTo.value;
    
    // from date
    fromDateOptions.maxDate = toDate;
    fromDateOptions.defaultDate = fromDate;
    flatpickr('#date-custom-from', fromDateOptions);

    // to date
    toDateOptions.minDate = fromDate;
    toDateOptions.defaultDate = toDate;
    flatpickr('#date-custom-to', toDateOptions)
}

function dateCustomFromChangeHandler() {

    // from date selected out of range on iOS devices, from date stays most recent date selected
    if (dateCustomFrom.value == "") {
        dateCustomFrom.value = fromDateOptions.defaultDate;
        // replot markers, plotMarkersCustom clears them with the from date being ''
        dateCustomFrom.dispatchEvent(new Event('change'));
    // from date selected within range
    } else {
        // update from datepicker's default date
        fromDateOptions.defaultDate = dateCustomFrom.value;
        flatpickr('#date-custom-from', fromDateOptions);

        // update to datepicker's min date
        toDateOptions.minDate = dateCustomFrom.value;
        flatpickr('#date-custom-to', toDateOptions);
    }
}
dateCustomFrom.addEventListener('change', dateCustomFromChangeHandler);

function dateCustomToChangeHandler() {
    
    // to date selected out of range on iOS devices, to date stays most recent date selected
    if (dateCustomTo.value == "") {
        dateCustomTo.value = toDateOptions.defaultDate;
        // replot markers, plotMarkersCustom clears them with the to date being ''
        dateCustomTo.dispatchEvent(new Event('change'));

    // to date selected within range
    } else {
        // update from datepicker's max date
        fromDateOptions.maxDate = dateCustomTo.value;
        flatpickr('#date-custom-from', fromDateOptions)

        // update to datepicker's defualt date
        toDateOptions.defaultDate = dateCustomTo.value;
        flatpickr('#date-custom-to', toDateOptions);
    }
}
dateCustomTo.addEventListener('change', dateCustomToChangeHandler);

//////////////////////////
/// LAYOUT ADJUSTMENTS ///
//////////////////////////

function layoutAdjustments() {
    // portrait
    if (window.innerWidth < 800 || window.innerWidth < window.innerHeight) {
        // fall back on map height being set to 50vh in css
        mapElement.style.height = '';
        // fill side panel to bottom
        const heightTop = parseFloat(window.getComputedStyle(document.getElementById('top')).getPropertyValue('height'));
        const heightMap = parseFloat(window.getComputedStyle(mapElement).getPropertyValue('height'));
        const heightSidePanel = window.innerHeight - heightTop - heightMap;
        sidePanel.style.height = heightSidePanel+'px';
    // landscape
    } else {
        const heightTop = parseFloat(window.getComputedStyle(document.getElementById('top')).getPropertyValue('height'));
        const heightSidePanel = Math.max(window.innerHeight - heightTop, 364);
        // map and side panel have same height
        mapElement.style.height = heightSidePanel+'px';
        sidePanel.style.height = heightSidePanel+'px';
        // vertically center bar chart
        barChart.style.top = (heightSidePanel - 64 - Math.max(window.innerHeight*0.5, 250))/2+'px'
    }
}
layoutAdjustments();
window.addEventListener('resize', layoutAdjustments);

////////////////////////
/// DATE TYPE CHANGE ///
////////////////////////

// handler for when date type changes
function dateTypeChangeHandler() {
    
    // year to custom
    if (dateType.value == 'custom') {
        // hide #date-year
        dateYear.style.display = 'none';
        // show #date-custom
        dateCustom.style.display = 'block';
        
        // update year for datepickers
        dateCustomFrom.value = '1/1/'+year;
        if (year == yearCurrent) {
            dateCustomTo.value = String(today.getMonth()+1)+'/'+today.getDate()+'/'+year;    
        } else {
            dateCustomTo.value = '12/31/'+year;
        }
        updateDatePickers();

    // custom to year
    } else {
        // show #date-year
        dateYear.style.display = 'unset';

        // hide #date-custom
        dateCustom.style.display = 'none';

        // update year from #date-custom-from and plot markers
        year = dateCustomFrom.value.substring(6);
        dateYear.value = year;
        // custom date range likely different from year range, replot markers
        plotMarkersYear();
    }

    layoutAdjustments();

}
dateType.addEventListener('change', dateTypeChangeHandler);

////////////////////////////
/// MARKER CLICK HANDLER ///
////////////////////////////

// used in selectMarker and defaultSidePanel
function unselectMarker() {
    const markerSelectedOld = document.querySelector('.marker-selected');
    if (markerSelectedOld) {
        markerSelectedOld.classList.remove('marker-selected');
    }
}

// select marker and display corresponding incident report
function selectMarker(incidentHTML) {
    // unselect previously selected marker
    unselectMarker();
    // select marker clicked on
    markerSelectedNew.classList.add('marker-selected');

    // hide default report
    sidePanelDefault.style.display = 'none';
    // remove previous incident report
    const incident = document.querySelector('.incident');
    if (incident) {
        incident.parentNode.removeChild(incident);
    }
    // append incident report to side panel and display it
    const dNode = document.createRange().createContextualFragment(incidentHTML);
    sidePanel.append(dNode);
}

// global so that selectMarker can access it
var markerSelectedNew;

// handler for when marker is clicked
function markerClickHandler(e) {
    // clicking marker already selected pulls up default report
    const markerSelectedOld = document.querySelector('.marker-selected');
    
    markerSelectedNew = e.target._icon;
    if (markerSelectedOld == markerSelectedNew) {
        defaultSidePanel();
    // unselected marker clicked
    } else {
        // get lat and long of marker clicked
        const latlngClicked = this._latlng
        const latClicked = latlngClicked.lat;
        const longClicked = latlngClicked.lng;

        // date type is year, loop through data backwards chronologically for year selected only
        if (dateType.value == 'year') { 
            const dataYear = dataYearly[year];
            for (let i = 0; i < dataYear.length; i++) {
                const d = dataYear[i];
                if (d.LAT == latClicked && d.LONG == longClicked) {
                    selectMarker(d.HTML);
                    break;
                }
            }

        // date type is custom, loop through data backwards chronologically for all years
        } else {
            const fromDate = adjustTimeZoneOffset(new Date(dateCustomFrom.value));
            const toDate = adjustTimeZoneOffset(new Date(dateCustomTo.value));
            for (let i = 0; i < dataChron.length; i++) {
                const d = dataChron[i];
                const dateIncident = adjustTimeZoneOffset(new Date(d.DATE));
                if (d.LAT == latClicked && d.LONG == longClicked && dateIncident >= fromDate && dateIncident <= toDate) {
                    selectMarker(d.HTML);
                    break;
                }
            }
        }
    }
}

//////////////////////////
/// DEFAULT SIDE PANEL ///
//////////////////////////

// switch to default side panel when map or selected marker clicked
function defaultSidePanel() {
    // switch to default side panel if default side panel not already being displayed
    if (sidePanelDefault.style.display == 'none') {
        // unselect selected marker
        unselectMarker();
        // show default side panel
        sidePanelDefault.style.display = 'unset';
        // remove incident from DOM
        const incident = document.querySelector('.incident');
        incident.parentNode.removeChild(incident);
        if (window.outerWidth >= 800) {
            newRectsHandler();
        }
    }
}
map.on('click', defaultSidePanel);

/////////////////////////////////////
/// BAR CHART RECT CLICK HANDLER ////
/////////////////////////////////////

// only larger devices have bar chart

var bindRectsClickHandler, newRectsHandler;
if (window.outerWidth >= 800) {
    
    // rect click handler, change year when rect clicked
    bindRectsClickHandler = function() {
        barChart.contentDocument.querySelectorAll('#svg-bar-chart rect').forEach(function(rect) {
            rect.addEventListener('click', function() {

                // date type is year
                if (dateType.value == 'year') {
                    // plot new markers if different year selected
                    if (year != window.yearClickedBarChart) {
                        // update year
                        year = window.yearClickedBarChart;
                        // update date val with year clicked, window.yearClickedBarChart from passYearParent in barChart.js
                        dateYear.value = year;
                        // plot markers for year selected
                        plotMarkersYear();
                    }

                // date type is custom
                } else {
                    // update fromDate, first day of year clicked
                    const fromDate = '01/01/'+window.yearClickedBarChart;
                    document.getElementById('date-custom-from').value = fromDate;
                    
                    // update date pickers
                    // current year selected, toDate is today's date
                    var toDate;
                    if (window.yearClickedBarChart == yearCurrent) {
                        toDate = today.getMonth()+'/'+today.getDate()+'/'+yearCurrent
                    // previous year selected, toDate is last day of previous year
                    } else {
                        toDate = '12/31/'+window.yearClickedBarChart;
                    }
                    document.getElementById('date-custom-to').value = toDate;
                    updateDatePickers();

                    // plot markers for year selected
                    plotMarkersCustomDate();
                }
            })
        })
    }

    newRectsHandler = function() {
        if (window.innerWidth >= 800) {
            setTimeout(function() {
                bindRectsClickHandler();
                barChart.contentDocument.getElementById('select-series').addEventListener('change', bindRectsClickHandler);    
            }, 200);
        }
    }
    barChart.addEventListener('load', newRectsHandler);
    window.addEventListener('resize', newRectsHandler);
}

// reset date type and year when navigating back to page
window.addEventListener('beforeunload', function() {
    dateType.selectedIndex = 0;
    dateYear.value = yearCurrent;
})