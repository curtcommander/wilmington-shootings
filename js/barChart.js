'use strict';

///////////////////////
/// BAR CHART SETUP ///
///////////////////////

// calculates number of pixels for given percent of window's inner height
// input is number signifying percent of vertical height 
// e.g. a value of 50 signifies 50%
function vh(v) {
    return (v * window.innerHeight)/100;
}

// calculates number of pixels for given percent of window's inner width
// works the same as vh
function vw(v) {
    return (v * window.innerWidth)/100;
}

// bar chart colors
const colors = ['black', '#D90022'];

// main bar chart variable
const barChartD3 = d3.select('#svg-bar-chart');

// x-axis
let years = [];
const yearCurrent=2021;
let y = 2011;
while (y <= yearCurrent) {
    years.push(y)
    y++
};

const xScale = d3
    .scaleBand()
    .domain(years)
    .padding(0.2)

const xAxis = barChartD3
    .append('g')
    .attr('id', 'x-axis')
    .attr('class', 'axis')

// y-axis
const yMaxTotal=197;
const yMaxYTD=24;

const yScaleTotal = d3
    .scaleLinear()
    .domain([0, yMaxTotal])

const yScaleYTD = d3
    .scaleLinear()
    .domain([0, yMaxYTD])

const yAxis = barChartD3
    .append('g')
    .attr('id', 'y-axis')
    .attr('class', 'axis');

//////////////////////////////////
/// RESET BAR CHART DIMENSIONS ///
//////////////////////////////////

// global variables for dimensions of SVGs
const barChartSVG = barChartD3.node();
var marginSVG, widthSVG, heightSVG, fontSize, heightBars;

function resetBarChartDimVars() {
    const barChartSVGStyles = window.getComputedStyle(barChartSVG);
    marginSVG = parseFloat(barChartSVGStyles.getPropertyValue('margin-top'));
    widthSVG = window.innerWidth - (2*marginSVG);
    // give space for stroke when tallest rect is hovered over
    heightSVG = parseFloat(barChartSVGStyles.getPropertyValue('height')) - vh(2);
    // make sure fontSize matches --font-size in barChart.css
    fontSize = Math.min(vw(2.5), 14);
    const heightXAxis = 0.71*10 + fontSize;
    heightBars = heightSVG - heightXAxis;
}

// reset bar chart axes
var xBandwidth;
function resetBarChartAxes() {
    // x-axis
    xScale.range([0, widthSVG]);
    xBandwidth = xScale.bandwidth();
    xAxis
        .attr('transform', 'translate(0,'+ heightBars + ')')
        .call(d3.axisBottom(xScale).tickSizeOuter(0));

    // y-axis (y-scale is series-dependent and set by setSeriesVars)
    yScaleTotal.range([heightBars, 0]);
    yScaleYTD.range([heightBars, 0]);
}

function resetBarChartDims() {
    resetBarChartDimVars();
    barChartD3.attr('viewBox', '0 0 ' + widthSVG + ' ' + heightSVG)
    resetBarChartAxes();
}

////////////////////////////
/// SET SERIES VARIABLES ///
////////////////////////////

// sets seriesNum, yScale, and dataSeries global variables
// which are used in other funnctions
// and depend on series selected (value of #select-series)

var seriesNum, yScale, dataSeries;
function setSeriesVars() {
    // seriesNum 
    seriesNum = document.getElementById('select-series').value;

    // yScale
    (seriesNum < 2) ? yScale = yScaleTotal :  yScale = yScaleYTD;

    // dataSeries
    dataSeries = d3.stack().keys(seriesNames[seriesNum])(data);
}   

///////////////////////
/// BAR CHART RECTS ///
///////////////////////

// rects structure
barChartD3
    // rects container
    .append('g')
    .attr('id', 'rects-bar-chart')
        // rect groups
        .selectAll('g').data(colors).enter().append('g')
        .attr('id', function(d) {return 'rects-bar-chart-'+d})
        .attr('fill', function(d,i) {return colors[i]})    
        .selectAll('rect').data(function(d) {return d}).enter()

function addRectsBarChart() {
    // clear old rects
    d3.selectAll('#rects-bar-chart rect').remove();

    // plot new rects
    for (let j=0; j<colors.length; j++) {
        d3.select('#rects-bar-chart g:nth-child('+(j+1)+')')
            .selectAll('rect').data(dataSeries[j]).enter().append('rect')
            .attr('x', function(d,i) {return xScale(yearCurrent-i)})
            .attr('y', function(d) {return yScale(d[1]-d[0])})
            .attr('width', xBandwidth)
            .attr('height', function(d) {return heightBars - yScale(d[1]-d[0])})
    }
}

////////////////////////
/// BAR CHART LABELS ///
////////////////////////

// labels structure
barChartD3
    // labels container
    .append('g')
    .attr('id', 'labels-bar-chart')
        // label groups    
        .selectAll('g').data(colors).enter().append('g')
        .attr('id', function(d) {return 'labels-bar-chart-'+d})

function getLabelText(d) {
    // get h, a measure of the relative height of the rect being labeled
    var yMax;
    (seriesNum < 2) ? yMax = yMaxTotal : yMax = yMaxYTD;
    const h = (d[1]-d[0])/yMax;

    // height of rect is too small, set rect's label as empty string
    if (h < 0.05) {
        return ''
    // rect is tall enough, normal label
    } else {
        return d[1]-d[0]
    }
}

function addLabelsBarChart() {
    // clear old labels
    d3.selectAll('.label-bar-chart').remove();

    // plot new labels
    for (let j=0; j<colors.length; j++) {
        d3.select('#labels-bar-chart g:nth-child('+(j+1)+')')
            .selectAll('rect').data(dataSeries[j]).enter().append('text')
            .attr('class', 'label-bar-chart')
            .attr('x', function(d,i) {return xScale(yearCurrent-i) + xBandwidth/2})
            .attr('y', function(d) {return yScale(d[1]-d[0]) + fontSize})
            .text(function(d) {return getLabelText(d)})
    }
}

//////////////
/// LEGEND ///
//////////////

// main legend variable
const legendD3 = d3.select('#svg-legend');

// legend structure
legendD3
    // legend entries
    .selectAll('g').data(colors).enter().append('g')
    .attr('id', function (d,i) {return 'legend-entry-'+colors[i]})
    .attr('class', 'legend-entry')

// reset variables for legend dimensions
var incidentsTextWidth, halfWidth;
function resetLegendDimVars() {   
    incidentsTextWidth = fontSize*6.57;
    halfWidth = window.innerWidth/2;
}

// reset height and width of legend svg
function resetLegendDims() {
    resetLegendDimVars();
    legendD3
        .attr('width', widthSVG)
        .attr('height', marginSVG)
}

// plot legend
function getLegendRectX(i) {
    switch(i) {
        case 0: return halfWidth - incidentsTextWidth - (2*marginSVG);
        case 1: return halfWidth + (0.5*marginSVG);
    }
}

// plot legend rects, labels added separately in addLabelsLegend
function addRectsLegend() {
    // remove old rects
    d3.selectAll('.rect-legend').remove();
    
    // plot new rects
    d3.selectAll('.legend-entry')
        .append('rect')
        .attr('class', 'rect-legend')
        .attr('fill', function(d, i) {return colors[i]})
        .attr('x', function(d,i) {return getLegendRectX(i)})
        .attr('width', marginSVG)
        .attr('height', marginSVG)
}

// legend labels
function getLegendLabelX(i) {
    switch(i) {
        case 0: return halfWidth - incidentsTextWidth - (0.5*marginSVG);
        case 1: return halfWidth + (2*marginSVG);
    }
}

// legend text
function getLegendLabelText(i) {
    switch(i) {
        case 0: return labelBlack;
        case 1: return labelRed;
    }
}

// called after initial plot and whenever series changes
var labelBlack, labelRed;
function addLabelsLegend() {

    // incidents label text
    if (seriesNum == '0' || seriesNum == '2') {     
        labelBlack = 'Total Incidents';
        labelRed = 'Homicide Incidents';
    // victims label text
    } else {
        labelBlack = 'Total Victims';
        labelRed = 'Victims Killed';
    }

    // clear old labels
    d3.selectAll('.label-legend').remove();
    
    // add new labels
    d3.selectAll('.legend-entry')
        .append('text')
        .attr('class', 'label-legend')
        .text(function(d, i) {return getLegendLabelText(i)})
        .attr('x', function(d,i) {return getLegendLabelX(i)})
        .attr('y', marginSVG/2)
        .attr('dy', '.35em')
}

/////////////////////////////////////
/// READ DATA AND BUILD BAR CHART ///
/////////////////////////////////////

// master function to build bar chart after data is read in
// also called when series selected changes 
function buildBarChart() {
    resetBarChartDims();
    setSeriesVars();
    addRectsBarChart();
    addLabelsBarChart();
}

// master function to build legend
function buildLegend() {
    resetLegendDims();
    addRectsLegend();
    addLabelsLegend();
}

// read in data and build SVGs
var seriesNames, data;
d3.csv('data/yearlyData.csv').then(function(dataCSV) {

    // these variables used in setSeriesVars
    data = dataCSV;
    seriesNames = [
        data.columns.slice(1,3),
        data.columns.slice(3,5),
        data.columns.slice(5,7),
        data.columns.slice(7,9)
    ]

    // build SVGs if large layout
    if (window.innerWidth > 0) {
        buildBarChart();
        buildLegend();
    }
})

///////////////////////////////
/// REPLOT ON SERIES CHANGE ///
///////////////////////////////

// handler for series change
function handlerChangeSeries() {
    buildBarChart();
    // only labels in the legend change with series selected
    // only need to call addLabelsLegend
    addLabelsLegend();
}
document.getElementById('select-series').addEventListener('change', handlerChangeSeries);

///////////////////////////////
/// REDRAW ON WINDOW RESIZE ///
///////////////////////////////

function redrawSVGs() {
    if (window.innerWidth > 0) {
        // series vars only need to be set if they haven't been already
        // i.e. when switching from small to large layout for the first time
        if (typeof(dataSeries) == 'undefined') {
            setSeriesVars();
        }
        resetBarChartDims();
        addRectsBarChart();
        addLabelsBarChart();
        buildLegend();
    }
}
window.addEventListener('resize', redrawSVGs);

// reset series to Incidents when navigating back to page
window.addEventListener('beforeunload', function() {
    document.getElementById('select-series').selectedIndex = 0;    
})

////////////////////////////
/// RECT EVENT LISTENERS ///
////////////////////////////

// outline around bars on hover
// stroke appears around black rect when black rect or its corresponding red rect is hovered over

// get black rect from event object
function getRectBlack(e) {
    e = e || window.event;
    const target = e.target || e.srcElement;
    if (target.tagName == 'rect') {
        const x = target.attributes['x'].value;
        return d3.select('#rects-bar-chart-black rect[x="'+x+'"]');
    } else {
        return false;
    }
}

function rectMouseover(e) {
    // get black rect
    const rectBlack = getRectBlack(e);
    // apply stroke styles to black rect
    if (rectBlack) {
        window.r = rectBlack;
        const h = Number(rectBlack.attr('height'));
        rectBlack.attr('stroke', 'black');
        rectBlack.attr('stroke-width', vh(1.5)+'px');
        rectBlack.attr('stroke-opacity', '0.4');
        rectBlack.attr('stroke-linecap', 'square');
        // vh values included as a hack to get dasharray to work on iOS
        rectBlack.attr('stroke-dasharray', (xBandwidth+h-vh(1.5)/2) + ' ' + (xBandwidth+vh(1.5)));
    }
}
barChartSVG.addEventListener('mouseover', function(e) {
    rectMouseover(e);
});

function rectMouseout(e) {
    // get black rect
    const rectBlack = getRectBlack(e);
    window.e = e;
    // make black rect's stroke width 0
    if (rectBlack) {
        rectBlack.attr('stroke-width', '0');
    }
}
barChartSVG.addEventListener('mouseout', function(e) {
    rectMouseout(e)
});

function rectClick(e) {
    e = e || window.event;
    const target = e.target || e.srcElement;
    if (target.tagName == 'rect') {
        const x = target.attributes['x'].value;
        const y = target.attributes['y'].value;
        const targetD3 = d3.select('#rects-bar-chart rect[x="'+x+'"][y="'+y+'"]');
        window.top.yearClickedBarChart = targetD3.data()[0].data.year;
    }
}
barChartSVG.addEventListener('click', function(e) {
    rectClick(e);
})
