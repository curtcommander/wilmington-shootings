///////////////////////
/// BAR CHART SETUP ///
///////////////////////

// calculates number of pixels for given percent of viewport's height
// input is number signifying percent of vertical height 
// e.g. a value of 50 signifies 50%
function vh(v) {
    const h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    return (v * h)/100;
}

// calculates number of pixels for given percent of viewport's width
// works the same as vh
function vw(v) {
    const h = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    return (v * h)/100;
}

// margins for bar chart
const margin = vh(3);

// initialize bar chart SVG and its container
// container used for setting bar chart's margins
const barChartContainer = d3
    .select('#svg-bar-chart')
    
const barChart = barChartContainer
    .append('g')
    .attr('id', 'svg-bar-chart-inner')
    .attr('transform', 'translate(' + margin + ',' + margin + ')');
    
// y scale
const svgBarChartStyles = window.getComputedStyle(document.getElementById('svg-bar-chart'));
const heightBarChart = parseFloat(svgBarChartStyles.getPropertyValue('height')) - margin*2 
                       - (6 + .71*vh(3)) // approximate height of x-axis
const yMaxTotal = 197;
const yMaxYTD = 90;

const yScaleTotal = d3.scaleLinear()
    .range([heightBarChart, 0])
    .domain([0, yMaxTotal])

const yScaleYTD = d3.scaleLinear()
    .range([heightBarChart, 0])
    .domain([0, yMaxYTD])

const yAxis = barChart
    .append('g')
    .attr('id', 'y-axis');
    
// x scale
const widthBarChart = parseFloat(svgBarChartStyles.getPropertyValue('width')) - margin*2;
let years = [];
const yearCurrent = 2020;
let y = 2011;
while (y <= yearCurrent) {
    years.push(y)
    y++
};

const xScale = d3
    .scaleBand()
    .range([0, widthBarChart])
    .domain(years)
    .padding(0.2);

const xBandwidth = xScale.bandwidth(); 

const xAxis = barChart
    .append('g')
    .attr('id', 'x-axis')
    .attr('transform', 'translate(0,'+ heightBarChart +')')
    .call(d3.axisBottom(xScale).tickSizeOuter(0));

// bar chart colors
const colors = ['black', '#D90022'];

////////////////////////////
/// SET SERIES VARIABLES ///
////////////////////////////

const seriesArray = ['Incidents', 'Victims', 'Incidents YTD', 'Victims YTD'];
function getSeriesNum() {
    seriesSelected = document.getElementsByClassName('ui-selectmenu-text')[0].innerHTML;
    for (i in seriesArray) {
        if (seriesArray[i] == seriesSelected) {
            return i;
        }
    }    
}

// sets seriesNum, yScale, and dataSeries global variables
// which are used in other funnctions
// and depend on series selected (value of #select-series)
function setSeriesVars() {
    // seriesNum 
    seriesNum = getSeriesNum();
    
    // yScale
    if (seriesNum < 2) {
        yScale = yScaleTotal;
    }
    else {
        yScale = yScaleYTD;
    }

    // dataSeries
    dataSeries = d3.stack().keys(seriesNames[seriesNum])(data);
}   

//////////////////////
/// PLOT BAR CHART ///
//////////////////////

function plotBarChart() {
    // clear old rects
    const rects = document.querySelector('#rects-bar-chart');
    if (rects) {
        rects.parentNode.removeChild(rects);
    }

    // plot new rects
    barChart
        // all rects
        .append('g')
        .attr('id', 'rects-bar-chart')
        .selectAll('g')
        .data(dataSeries)
        .enter()
            // black and red rect groups
            .append('g')
            .attr('id', function(d,i) {return 'rects-bar-chart-' + colors[i]})
            .attr('fill', function(d,i) {return colors[i]})
            .selectAll('rect')
            .data(function(d) {return d})
            .enter()
                // individual rects
                .append('rect')
                .attr('x', function(d,i) {return xScale(yearCurrent-i)})
                .attr('y', function(d) {return yScale(d[1]-d[0]) + margin - margin})
                .attr('width', xBandwidth)
                .attr('height', function(d) {return heightBarChart - yScale(d[1]-d[0])})
}

////////////////////////////
/// LABELS FOR BAR CHART ///
////////////////////////////

function getLabelText(d) {
    // get h, a measure of the relative height of the rect being labeled
    if (seriesNum < 2) {
        yMax = yMaxTotal;
    }
    else {
        yMax = yMaxYTD;
    }
    h = (d[1]-d[0])/yMax;

    // height of rect is too small, set rect's label as empty string
    if (h < 0.05) {
        return ''
    // rect is tall enough, normal label
    } else {
        return d[1]-d[0]
    }
}

function labelsBarChart() {
    // clear old labels
    const labels = document.querySelector('#labels-bar-chart');
    if (labels) {
        labels.parentNode.removeChild(labels);
    }

    // add new labels
    barChart
        // all labels
        .append('g')
        .attr('id', 'labels-bar-chart')
        .selectAll('g')
        .data(dataSeries)
        .enter()
            // labels for black and red rect groups
            .append('g')
            .attr('id', function(d,i) {return 'labels-bar-chart-' + colors[i]})
            .selectAll('text')
            .data(function(d) {return d})
            .enter()
                // individual labels
                .append('text')
                .attr('class', 'label-bar-chart')
                .attr('x', function(d,i) {return xScale(yearCurrent-i) + xBandwidth/2})
                .attr('y', function(d) {return yScale(d[1]-d[0]) + margin - 0.5})
                .text(function(d) {return getLabelText(d)})
                .attr('text-anchor', 'middle')
                .attr('fill', 'white')
                .style('font-size', '3vh')
}

///////////////////////
/// EVENT LISTENERS ///
///////////////////////

// outline around bars on hover
// stroke appears around black rect when black rect or its corresponding red rect is hovered over

// called in rectMouseenter and rectMouseout
function getRectBlack(rect) {
    const x = rect.attributes['x'].value
    return d3.select('#rects-bar-chart-black rect[x="'+x+'"]');
}

function rectMouseenter(rect) {
    rectBlack = getRectBlack(rect);
    h = Number(rectBlack.attr('height'));
    rectBlack.attr('stroke', 'black');
    rectBlack.attr('stroke-width', '1.5vh');
    rectBlack.attr('stroke-opacity', '0.4');
    rectBlack.attr('stroke-dasharray', (xBandwidth+h-0.1) + ' ' + (xBandwidth+0.2))
}

function rectMouseout(rect) {
    rectBlack = getRectBlack(rect);
    rectBlack.attr('stroke-width', '0');
}

function bindRectHoverListeners () {
    rects = document.querySelectorAll('rect')
    rects.forEach(function(rect) {
        rect.addEventListener('mouseover', function() {rectMouseenter(rect)});
        rect.addEventListener('mouseout', function() {rectMouseout(rect)});
    })
}

// pass rect's corresponding year to parent document on click
function bindRectClickListeners() {
    d3.selectAll( 'rect' ).on('click', function(d) {
        window.top.yearClicked = d.data.year;
    });
}

//////////////
/// LEGEND ///
//////////////

const halfWidth = parseFloat(window.getComputedStyle(document.getElementById('svg-bar-chart')).getPropertyValue('width'))/2;
const incidentsTextWidth = vw(10);

// plot legend
function getLegendRectX(i) {
    switch(i) {
        case 0: return halfWidth - margin*2.5 - incidentsTextWidth;
        case 1: return halfWidth + margin;
    }
}

// labels added separately in labelsLegend
function plotLegend() {
    // legend
    d3.select('#svg-legend')
        .attr('height', margin)
        .selectAll('g')
        .data(colors)
        .enter()
            // legend entries 
            .append('g')
            .attr('id', function (d,i) {return 'legend-entry-'+colors[i]})
            .attr('class', 'legend-entry')
            .attr('font-size', '3vh')
                // legend rects
                .append('rect')
                .attr('class', 'rect-legend')
                .attr('x', function(d,i) {return getLegendRectX(i)})
                .attr('width', margin)
                .attr('height', margin)
                .style('fill', function(d, i) {return colors[i]})
}

// legend labels
function getLegendLabelX(i) {
    switch(i) {
        case 0: return halfWidth - margin - incidentsTextWidth;
        case 1: return halfWidth + margin*2.5;
    }
}

function getLegendLabelText(i) {
    switch(i) {
        case 0: return labelBlack;
        case 1: return labelRed;
    }
}

// called after initial plot and whenever series changes
function labelsLegend () {
    // incidents label text
    if (seriesNum == '0' || seriesNum == '2') {     
        labelBlack = 'Incidents';
        labelRed = 'Homicide Incidents';
    // victims label text
    } else {
        labelBlack = 'Victims';
        labelRed = 'Killed';
    }

    // clear old labels
    const labels = document.querySelectorAll('.label-legend');
    if (labels) {
        labels.forEach(function(label) {
            label.parentNode.removeChild(label);
        })
    }

    // add new labels
    d3.selectAll('.legend-entry')
        .append('text')
        .attr('class', 'label-legend')
        .text(function(d, i) {return getLegendLabelText(i)})
        .attr('x', function(d,i) { return getLegendLabelX(i)})
        .attr('y', margin/2)
        .attr('dy', '.35em')
        .attr('font-size', '1.2em')
}

/////////////////////////////////////
/// READ DATA AND BUILD BAR CHART ///
/////////////////////////////////////

// master function to build bar chart after data is read in
// also called when series selected changes 
function buildBarChart() {
    setSeriesVars();
    plotBarChart();
    labelsBarChart();
    bindRectHoverListeners();
    bindRectClickListeners();
}

// read in data
d3.csv('data/yearlyData.csv')
.then(function(data) {
    // pass data to parent document
    window.data = data;
    // get series names from data
    seriesNames = [
        data.columns.slice(1,3),
        data.columns.slice(3,5),
        data.columns.slice(5,7),
        data.columns.slice(7,9)
    ];
    buildBarChart();
    // plotLegend only needs to be called once
    // (not called when series selected changes)
    plotLegend();
    labelsLegend();
})

/////////////////////
/// SERIES CHANGE ///
/////////////////////

// handler for series change
function handlerChangeSeries() {
    buildBarChart();
    // only labels in the legend change with series selected
    labelsLegend();
}
$('#select-series').selectmenu({
    change: handlerChangeSeries
})