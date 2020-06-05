///////////////////////
/// BAR CHART SETUP ///
///////////////////////

// calculates number of pixels for given percent of viewport's height
// input is number signifying percent of vertical height 
// e.g. a value of 50 signifies 50%
function vh(v) {
    return (v * window.innerHeight)/100;
}

// calculates number of pixels for given percent of viewport's width
// works the same as vh
function vw(v) {
    return (v * window.innerWidth)/100;
}

// bar chart colors
const colors = ['black', '#D90022'];

// initialize bar chart
const barChartD3 = d3.select('#svg-bar-chart')

// variables for dimensions of SVGs
const barChartSVG = barChartD3.node();
const heightXAxis = 0.71*10 + Math.min(vw(2.5), 14);

function resetDimVars() {
    barChartSVGStyles = window.getComputedStyle(barChartSVG);
    marginSVG = parseFloat(barChartSVGStyles.getPropertyValue('margin'));
    widthSVG = window.innerWidth - (2*marginSVG);
    heightSVG = parseFloat(barChartSVGStyles.getPropertyValue('height'));
    heightBars = heightSVG - heightXAxis;
}

// x scale
let years = [];
const yearCurrent = 2020;
let y = 2011;
while (y <= yearCurrent) {
    years.push(y)
    y++
};

xScale = d3
    .scaleBand()
    .domain(years)
    .padding(0.2)

xAxis = barChartD3
    .append('g')
    .attr('id', 'x-axis')
    .attr('class', 'axis')

// y scale
const yMaxTotal = 197;
const yMaxYTD = 90;

yScaleTotal = d3.scaleLinear()
    .domain([0, yMaxTotal])

yScaleYTD = d3.scaleLinear()
    .domain([0, yMaxYTD])

yAxis = barChartD3
    .append('g')
    .attr('id', 'y-axis')
    .attr('class', 'axis');

function resetAxes() {
    // x axis
    xScale.range([0, widthSVG])
    xAxis
      .attr('transform', 'translate(0,'+ heightBars + ')')
      .call(d3.axisBottom(xScale).tickSizeOuter(0))

    xBandwidth = xScale.bandwidth();

    // y axis (y-scale is series-dependent and set by setSeriesVars)
    yScaleTotal.range([heightBars, 0]);
    yScaleYTD.range([heightBars, 0]);
}

function resetDims() {
    resetDimVars();    
    barChartD3.attr('viewBox', '0 0 ' + widthSVG + ' ' + heightSVG)
    resetAxes();
}

////////////////////////////
/// SET SERIES VARIABLES ///
////////////////////////////

// sets seriesNum, yScale, and dataSeries global variables
// which are used in other funnctions
// and depend on series selected (value of #select-series)
function setSeriesVars() {
    // seriesNum 
    seriesNum = document.getElementById('select-series').value;
    
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
    const rectsBarChart = document.getElementById('rects-bar-chart');
    if (rectsBarChart) {
        rectsBarChart.parentNode.removeChild(rectsBarChart);
    }

    // plot new rects
    barChartD3
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
            .attr('y', function(d) {return yScale(d[1]-d[0])})
            .attr('width', xBandwidth)
            .attr('height', function(d) {return heightBars - yScale(d[1]-d[0])})
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
    barChartD3
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
                .attr('y', function(d) {return yScale(d[1]-d[0]) + Math.min(vw(3), 12)})
                .text(function(d) {return getLabelText(d)})
                .attr('text-anchor', 'middle')
                .attr('fill', 'white')
                .attr('pointer-events', 'none')
                .style('font-size', 'min(2.5vw, 14px)')
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
    rects = document.querySelectorAll('#svg-bar-chart rect');
    rects.forEach(function(rect) {
        rect.addEventListener('mouseover', function() {rectMouseenter(rect)});
        rect.addEventListener('mouseout', function() {rectMouseout(rect)});
    })
}

// pass rect's corresponding year to parent document on click
function bindRectClickListeners() {
    d3.selectAll( 'rect' ).on('click', function(d) {
        window.top.yearClickedBarChart = d.data.year;
    });
}

//////////////
/// LEGEND ///
//////////////

// plot legend
function getLegendRectX(i) {
    switch(i) {
        case 0: return halfWidth - marginSVG*2.5 - incidentsTextWidth;
        case 1: return halfWidth + marginSVG;
    }
}

legendD3 = d3.select('#svg-legend');

// labels added separately in labelsLegend
function plotLegend() {
    
    halfWidth = parseFloat(window.getComputedStyle(barChartSVG).getPropertyValue('width'))/2;
    incidentsTextWidth = Math.min(vw(2.5),14)*7;

    // remove old rects
    legendEntries = legendD3.node().querySelectorAll('.legend-entry');
    if (legendEntries.length > 0) {
        legendEntries.forEach(function(legendEntry) {
            legendEntry.parentNode.removeChild(legendEntry);
        })
    }

    legendD3
    // legend
        .attr('width', widthSVG)
        .attr('height', marginSVG + 3)
        .selectAll('g')
        .data(colors)
        .enter()
            // legend entries 
            .append('g')
            .attr('id', function (d,i) {return 'legend-entry-'+colors[i]})
            .attr('class', 'legend-entry')
            .attr('font-size', 'min(2.5vw, 14px)')
                // legend rects
                .append('rect')
                .attr('class', 'rect-legend')
                .attr('x', function(d,i) {return getLegendRectX(i)})
                .attr('width', marginSVG)
                .attr('height', marginSVG)
                .style('fill', function(d, i) {return colors[i]})
}

// legend labels
function getLegendLabelX(i) {
    switch(i) {
        case 0: return halfWidth - marginSVG - incidentsTextWidth;
        case 1: return halfWidth + marginSVG*2.5;
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
        labelBlack = 'Total Incidents';
        labelRed = 'Homicide Incidents';
    // victims label text
    } else {
        labelBlack = 'Total Victims';
        labelRed = 'Victims Killed';
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
        .attr('x', function(d,i) {return getLegendLabelX(i)})
        .attr('y', marginSVG/2)
        .attr('dy', '.35em')
        .attr('font-size', '1.2em')
}

/////////////////////////////////////
/// READ DATA AND BUILD BAR CHART ///
/////////////////////////////////////

// master function to build bar chart after data is read in
// also called when series selected changes 
function buildBarChart() {
    resetDims();
    setSeriesVars();
    plotBarChart();
    labelsBarChart();
    bindRectHoverListeners();
    bindRectClickListeners();
}
window.addEventListener('resize', function() {
    if (window.innerWidth >= 300) {
        resetDims();
        plotBarChart();
        labelsBarChart();
        bindRectHoverListeners();
        bindRectClickListeners();
        plotLegend();
        labelsLegend();
    }
});

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
document.getElementById('select-series').addEventListener('change', handlerChangeSeries);
