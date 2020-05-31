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
function getIconSize() {
    const mapStyles = window.getComputedStyle(document.getElementById('map'));
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
        const svg = marker.querySelector('svg');
        svg.style.width = sizeCSS;
        svg.style.height = sizeCSS;
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

// load current data
function loadCurrentData(response) {
    return new Promise(function(resolve) {
        response.arrayBuffer().then(function(buffer) {
            // get data as string
            const blob = new Blob([buffer], {type : "application/zip"});
            const zip = new JSZip();
            zip.loadAsync(blob).then(function(zip) {
                return zip.file('incidentDataCurrent.csv').async('string');
            // parse and return data
            }).then(function(dataAsString) {
                currentData = d3.csvParse(dataAsString); 
                resolve(currentData);
            })
        })
    })
}

// plot data returned by loadCurrentData
const markers = L.layerGroup();
function plotCurrentData(currentData) {
    return new Promise(function(resolve) {
        // set intial icon size by calling adjustIcons
        adjustIcons();
        for (i = 0; i < currentData.length; i++) {
            L.marker([currentData[i].LAT, currentData[i].LONG], {icon: icon})
                .on("click", markerClickHandler)
                .addTo(markers)
        }
        markers.addTo(map);
        // pass currentData to prepareData
        resolve(currentData);
    })   
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

function prepareDataObjects(intialData) {
    // add initial data to dataChron and dataYearly
    dataChron = currentData;
    for (i = 0; i < dataChron.length; i++) {
        let d = dataChron[i];
        // remove year from dataChron
        delete d.YEAR;
        // add incident to dataYearly (year currently set to most recent year)
        dataYearly[year].push({'LAT': d.LAT, 'LONG': d.LONG, 'HTML': d.HTML})
    }

    // load rest of data into dataYearly and dataChron
    fetch('data/incidentDataPrevious.zip').then(function(response) {
        // get data as string
        response.arrayBuffer().then(function(buffer) {
            var blob = new Blob([buffer], {type : "application/zip"});
            var zip = new JSZip();
            zip.loadAsync(blob).then(function(zip) {
                return incidentData = zip.file('incidentDataPrevious.csv').async('string');
            })
        // parse data
        .then(function(dataAsString) {
            return d3.csvParse(dataAsString);
        // add data to dataYearly and dataChron
        }).then(function(data) {            
            data.forEach(function(d) {
                // dataYearly
                dataYearly[d.YEAR].push({'LAT': d.LAT, 'LONG': d.LONG, 'HTML': d.HTML})
                // dataChron
                delete d.YEAR;
                dataChron.push(d);
                })
            })
        })
    })
}

fetch('data/incidentDataCurrent.zip')
.then(loadCurrentData)
.then(plotCurrentData)
.then(prepareDataObjects)

////////////////////
/// PLOT MARKERS ///
////////////////////

// plot markers for year selected
function plotMarkersYear() {
    // clear old markers
    markers.clearLayers();
    // add new markers corresponding to year selected
    const dataYear = dataYearly[year];
    for (i = 0; i < dataYear.length; i++) {
        L.marker([dataYear[i].LAT,dataYear[i].LONG], {icon: icon})
            .on("click", markerClickHandler)
            .addTo(markers)};
    markers.addTo(map);
}
// year change
document.getElementById('date-year').addEventListener('change', function() {
    year = this.value;
    plotMarkersYear();
})

// negate time zone offset when date object parsed from string
function adjustTimeZoneOffset (d) {
    return new Date(d.getTime() + d.getTimezoneOffset()*60000)
}

// plot markers for custom date range
function plotMarkersCustomDate() {
    // clear old markers
    markers.clearLayers();
    // add new markers that fall in date range selected 
    const fromDate = adjustTimeZoneOffset(new Date(document.getElementById('date-custom-from').value));
    const toDate = adjustTimeZoneOffset(new Date(document.getElementById('date-custom-to').value));
    // loop through dataChron (chronologically descending)
    for (i = 0; i < dataChron.length; i++) {
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
document.querySelectorAll('#date-custom-from, #date-custom-to').forEach(function(dateCustom) {
    dateCustom.addEventListener('change', plotMarkersCustomDate);
})

////////////////////
/// DATE PICKERS ///
////////////////////

fromDateOptions = {
    dateFormat: 'm/d/Y',
    minDate: '01/01/2011'
}

toDateOptions = {
    dateFormat: 'm/d/Y',
    maxDate: 'today'
}

function updateDatePickers() {
    const fromDate = document.getElementById('date-custom-from').value;
    const toDate = document.getElementById('date-custom-to').value;
    
    // from date
    fromDateOptions.maxDate = toDate;
    fromDateOptions.defaultDate = fromDate;
    flatpickr('#date-custom-from', fromDateOptions);

    // to date
    toDateOptions.minDate = fromDate;
    toDateOptions.defaultDate = toDate;
    flatpickr('#date-custom-to', toDateOptions)
}

// ensure max from date is to date
document.getElementById('date-custom-to').addEventListener('change', function() {
    fromDateOptions.maxDate = document.getElementById('date-custom-to').value;
    fromDateOptions.defaultDate = document.getElementById('date-custom-from').value;
    flatpickr('#date-custom-from', fromDateOptions)
})

// ensure min to date is from date
document.getElementById('date-custom-from').addEventListener('change', function() {
    toDateOptions.minDate = document.getElementById('date-custom-from').value;
    toDateOptions.defaultDate = document.getElementById('date-custom-to').value;
    flatpickr('#date-custom-to', toDateOptions)
})

/////////////////
/// DATE TYPE ///
/////////////////

// handler for when date type changes
function dateTypeChangeHandler() {
    // get date type
    const dateType = document.getElementById('date-type').value;
    
    // year to custom
    if (dateType == 'custom') {
        // hide #date-year
        document.getElementById('date-year').style.display = 'none';
        // show #date-custom
        document.getElementById('date-custom').style.display = 'block';

        // get heights of map and side panel on first switch to custom date type
        if (typeof(heightCustom) == 'undefined') {
            heightYear = window.getComputedStyle(document.getElementById('map')).getPropertyValue('height');
            heightDateCustom = parseFloat(window.getComputedStyle(document.getElementById('date-custom')).getPropertyValue('height'));
            heightCustom = parseFloat(heightYear) - heightDateCustom + 'px';
        }

        // adjust heights of map and side panel
        document.getElementById('map').style.height = heightCustom;
        document.getElementById('side-panel').style.height = heightCustom;

        // update year for datepickers
        document.getElementById('date-custom-from').value = '1/1/'+year;
        if (year == yearCurrent) {
            const today = new Date();
            document.getElementById('date-custom-to').value = String(today.getMonth()+1)+'/'+today.getDate()+'/'+year;    
        } else {
            document.getElementById('date-custom-to').value = '12/31/'+year;
        }
        updateDatePickers();

    // custom to year
    } else {
        // show #date-year
        const dateYear = document.getElementById('date-year');
        dateYear.style.display = 'unset';
        // hide #date-custom
        document.getElementById('date-custom').style.display = 'none';
        // adjust heights of map and side panel (heightYear set below)
        document.getElementById('map').style.height = heightYear;
        document.getElementById('side-panel').style.height = heightYear;

        // update year from #date-custom-from and plot markers
        year = document.getElementById('date-custom-from').value.substring(6);
        dateYear.value = year;
        // custom date range likely different from year range, replot markers
        plotMarkersYear();
    }
}
document.getElementById('date-type').addEventListener('change', dateTypeChangeHandler);

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
function selectMarker() {
    // unselect previously selected marker
    unselectMarker();
    // select marker clicked on
    markerSelectedNew.classList.add('marker-selected');

    // hide default report
    document.getElementById('side-panel-default').style.display = 'none';
    // remove previous incident report
    const incident = document.querySelector('.incident');
    if (incident) {
        incident.parentNode.removeChild(incident);
    }
    // append incident report to side panel and display it
    const dNode = document.createRange().createContextualFragment(d.HTML);
    document.getElementById('side-panel').append(dNode);
}


// handler for when marker is clicked
function markerClickHandler(e) {
    // clicking marker already selected pulls up default report
    const markerSelectedOld = document.querySelector('.marker-selected');
    // global so that selectMarker can access it
    markerSelectedNew = e.target._icon;
    if (markerSelectedOld == markerSelectedNew) {
        defaultSidePanel();
    // unselected marker clicked
    } else {
        // get lat and long of marker clicked
        const latlngClicked = this._latlng
        const latClicked = latlngClicked.lat;
        const longClicked = latlngClicked.lng;

        // get date type
        const dateType = document.getElementById('date-type' ).value;
        
        // date type is year, loop through data backwards chronologically for year selected only
        if (dateType == 'year') { 
            var dataYear = dataYearly[year];
            for (let i = 0; i < dataYear.length; i++) {
                d = dataYear[i];
                if (d.LAT == latClicked && d.LONG == longClicked) {
                    selectMarker();
                    break;
                }
            }

        // date type is custom, loop through data backwards chronologically for all years
        } else {
            const fromDate = adjustTimeZoneOffset(new Date(document.getElementById('date-custom-from').value));
            const toDate = adjustTimeZoneOffset(new Date(document.getElementById('date-custom-to').value));
            for (let i = 0; i < dataChron.length; i++) {
                d = dataChron[i];
                const date = adjustTimeZoneOffset(new Date(d.DATE));
                if (d.LAT == latClicked && d.LONG == longClicked && date >= fromDate && date <= toDate) {
                    selectMarker();
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
    if (document.getElementById('side-panel-default').style.display == 'none') {
        // unselect selected marker
        unselectMarker();
        // show default side panel
        document.getElementById('side-panel-default').style.display = 'unset';
        // remove incident from DOM
        const incident = document.querySelector('.incident');
        incident.parentNode.removeChild(incident);
    }
}
map.on('click', defaultSidePanel);

//////////////////
/// BAR CHART ////
//////////////////

// change year by clicking on chart
bindRectsClickHandler = function() {
    barChart.contentDocument.querySelectorAll('#svg-bar-chart rect').forEach(function(rect) {
        rect.addEventListener('click', function() {

            // date type is year
            if (document.getElementById('date-type').value == 'year') {
                // plot new markers if different year selected
                if (year != window.yearClickedBarChart) {
                    // update year
                    year = window.yearClickedBarChart;
                    // update date val with year clicked, window.yearClickedBarChart from passYearParent in barChart.js
                    document.getElementById('date-year').value = year;
                    // plot markers for year selected
                    plotMarkersYear();
                }

            // date type is custom
            } else {
                // update fromDate, first day of year clicked
                fromDate = '01/01/'+window.yearClickedBarChart;
                document.getElementById('date-custom-from').value = fromDate;
                
                // update toDate
                // current year selected, toDate is today's date
                if (window.yearClickedBarChart == yearCurrent) {
                    today = new Date();
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

// bind handlers to rect click events
// window load event and setTimeout used to ensure rects are selected
// when iframe load event is used the rects don't get selected sometimes
window.addEventListener('load', function() {
    setTimeout(function() {
        barChart = window.frames['barChart'];
        bindRectsClickHandler();
        barChart.contentDocument.querySelector('#select-series').addEventListener('change', bindRectsClickHandler);
    }, 100)
})
