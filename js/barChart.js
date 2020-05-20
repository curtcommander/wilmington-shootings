// set seriesVal
seriesArray = ['Incidents', 'Victims', 'Incidents YTD', 'Victims YTD'];
function setSeriesVal() {
    seriesSelected = $('.ui-selectmenu-text').html();
    for (i in seriesArray) {
        if (seriesArray[i] == seriesSelected) {
            parent.seriesVal = i;
            break;
        }
    }    
};

// changeSeries
function changeSeries() {
    setSeriesVal();
    plot(data);
    addLabels(dataset);
    hoverHandler();
    legendTxt();
};

// select menu
$('#seriesSelect').selectmenu({
    change: changeSeries
});
$( '.ui-icon' ).remove();

// modify figure.html (selected attribute)
$( '#seriesSelect option' ).each(function (index) {
    if (index == parent.seriesVal) {
        $( '#seriesSelect' ).val(index);
        $( '#seriesSelect' ).selectmenu('refresh');
    }
})

// dimensions
function vh(v) {
    var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    return (v * h) / 100;
}

var margin = {top: vh(3), right: vh(3), bottom: vh(3), left: vh(3)};

var legend = d3.select('#legendSVG')
    .attr('display', 'block')    
    .style('width', $( window ).width()-1)
    .style('height', '20px');

var verticalSpace = $( window).height() - parseInt($( '#container' ).css('padding-top')) 
                    - parseInt($( '#container' ).css('padding-bottom')) - 20;

var svg = d3.select('#mainSVG')
    .attr('display', 'block')    
    .style('width', $( window ).width()-1)
    .style('height', verticalSpace - $( '#containerSelect' ).height() - margin.bottom);

var width = $( '#mainSVG' ).width() - margin.left - margin.right,
    height = $( '#mainSVG' ).height() - margin.top - margin.bottom;
    
var container = svg.append('g')
    .attr('class', 'containerSVG')
    .attr("transform", "translate(" + margin.left + "," + margin.top*-1 + ")");

//adjust location of container within body (centered vertically)
$( '#container' ).css('transform', 'translate(0,'+(($( 'body' ).height() - $( '#container').outerHeight())/2)+'px');

// y scale
yMaxTotal=217;
yMaxYTD=92;

const yScaleTotal = d3.scaleLinear()
    .range([height, 0])
    .domain([0, yMaxTotal])

const yScaleYTD = d3.scaleLinear()
    .range([height, 0])
    .domain([0, yMaxYTD])

var yAxis = container.append('g')
    .attr('class', 'Yaxis');
    
// x scale
years = [];
yearCurrent=2020;
y = 2011;
while (y <= yearCurrent) {
    years.push(y)
    y++
};

var xScale = d3.scaleBand()
    .range([0, width])
    .domain(years)
    .padding(0.2);

var xAxis = container.append('g')
    .attr('class', 'Xaxis')
    .attr('transform', 'translate(0,'+(height + margin.top - margin.bottom)+')')
    .call(d3.axisBottom(xScale).tickSizeOuter(0));

// plot bar chart
function plot(data) {
    series = [data.columns.slice(1,3),
              data.columns.slice(3,5),
              data.columns.slice(5,7),
              data.columns.slice(7,9)];
    seriesNum = Number(parent.seriesVal);
    if (seriesNum < 2) {
        yScale = yScaleTotal;
    }
    else {
        yScale = yScaleYTD;
    }
    dataset = d3.stack().keys(series[seriesNum])(data);
    container.selectAll('.remove').remove();
    container.append('g')
        .selectAll('g')
        .data(dataset)
        .enter().append('g')
            .attr('fill', function(d,i) { return colors[i]; })
            .attr('class', 'remove')
            .selectAll('rect')
            .data(function(d) {return d; })
            .enter().append('rect')
                .attr('class', 'remove')
                .attr('class', function(d) { 
                    if (d[0] == 0) {
                        return 'remove black'
                    } else {
                        return 'remove red'
                    }
                })
                .attr('width', xScale.bandwidth())
                .attr('x', function(d,i) { return xScale(yearCurrent-i) })
                .attr('height', function(d) {return height - yScale(d[1]-d[0]) })
                .attr('y', function(d) {return yScale(d[1]-d[0]) + margin.top - margin.bottom})
}
// labels
function addLabels(dataset) {
    seriesNum = Number(parent.seriesVal);
    if (seriesNum < 2) {
        yScale = yScaleTotal;
    }
    else {
        yScale = yScaleYTD;
    }
    container.selectAll('.label').remove();
    container.append('g')
        .selectAll('.label')
        .data(dataset)
        .enter().append('g')
            .selectAll('text')
            .data(function(d) {return d; })
            .enter().append('text')
                .text(function(d) {
                    if (seriesNum < 2) {
                        yMax = yMaxTotal;
                    }
                    else {
                        yMax = yMaxYTD;
                    }
                    h = (d[1]-d[0])/yMax;
                    if (h < 0.05) {
                        return ''
                    } else {
                        return d[1]-d[0]
                    }
                })
                .attr('class','label')
                .attr('text-anchor', 'middle')
                .attr('fill', 'white')
                .style('font-size', '3vh')
                .attr("x", function(d,i) {return xScale(yearCurrent-i) + xScale.bandwidth()/2;})
                .attr('y', function(d) {return yScale(d[1]-d[0]) + margin.top - 0.5});
};

// Firefox compatibility
$(function firefox () {
    if (navigator.userAgent.indexOf("Firefox") != -1) {
        function adjustFirefox () { 
           $( 'select' ).css({
               'color' : 'transparent',
               'text-shadow' : '0 0 0 #000'
           })
        };
        adjustFirefox();
    }
});

w = xScale.bandwidth();    
// handler for hover over rects
function hoverHandler() {$( 'rect' ).hover(
    function() {
        x = $( this ).attr('x');
        target = $('rect.black[x="'+x+'"]' );
        h = Number(d3.select('rect.black[x="'+x+'"]').attr('height'));
        target.css({
            'stroke': 'black',
            'stroke-opacity': '0.4',
            'stroke-width': '1.5vh',
            'stroke-dasharray': (w+h-0.1)+' '+(w+0.2)
        });
        },
    function() {
        x = $( this ).attr('x');
        $('rect.black[x="'+x+'"]' ).css({
            'stroke-width': '0'
            });
        }
    )
};

// read in data, plot, label    
colors = ['black', '#D90022'];
d3.csv('../data/yearlyData.csv')
.then(function(data) {
    window.data = data;
    plot(data);
    hoverHandler();
    function passYearParent() {
        d3.selectAll( 'rect.remove' ).on('click', function(d) {
            window.top.yearClicked = d.data.year;
        });
    }
    passYearParent();
    d3.select( 'ul' ).on('click', passYearParent);
    return dataset;
})
.then(function(dataset) {
    addLabels(dataset);
});

// legend
scalar = $( '#mainSVG' ).height()*18/544+5;
margin.legend = vh(3);
halfWidth = $( '#mainSVG' ).width()/2;

function getTextWidth(text, font) {
    var canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
    var context = canvas.getContext("2d");
    context.font = font;
    var metrics = context.measureText(text);
    return metrics.width;
}

var legendEntries = legend.selectAll('.legend')
    .data(colors)
    .enter().append('g')
    .attr('class', 'legend')
    .attr('id', function (d,i) { return i;})
    .attr('font-size', '3vh')
    
function legendTxt () {
    if (parent.seriesVal == '0' || parent.seriesVal == '2') {     
        case0 = 'Incidents';
        case1 = 'Homicide Incidents';
    } else {
        case0 = 'Victims';
        case1 = 'Killed';
    }

    legendEntries.selectAll('text').remove();
    legendEntries.append('text')
        .attr('y', scalar/2)
        .attr('dy', '.35em')
        .attr('font-size', '1.2em')
        .text(function(d, i) { 
            switch (i) {
            case 0: return case0;
            case 1: return case1;
            }
        })
        .attr('x', function(d,i) {
            if (i==0) {
                return halfWidth - margin.legend - getTextWidth('Incidents', 'normal '+$( '#0 text' ).css('font-size')+' Roboto');
            } else {
                return halfWidth + margin.legend + scalar*1.5;
            }
        });
}
legendTxt();

legendEntries.append("rect")
    .attr('x', function(d,i) {
        if (i==0) {
            return halfWidth - getTextWidth('Incidents', 'normal '+$( '#0 text' ).css('font-size')+' Roboto') - margin.legend - scalar*1.5;
        } else {
            return halfWidth + margin.legend;
        }
    })
    .attr("width", scalar)
    .attr("height", scalar)
    .style("fill", function(d, i) {return colors[i]});