var districts = [];
var matrix = [];
var districtIndex = {};
var rows = [];
var svg;
var info;
var tooltip;
var width = 750;
var height = 750;
var chord;
var labelSize = 100;

var addDistrict = function(d) {
  if (d) {
    if (! districtIndex[d]) {
      districtIndex[d] = 1;
    }
  }
}

var createMap = function(data) {
  var displayType = $( "input:radio[name=display-type]:checked" ).val();
  rows = data;

  $.each(data, function(i, row) {
    addDistrict(row.give);
    addDistrict(row.get);
    var x = 2;
    while (row['get_'+x]) {
      addDistrict(row['get_'+x]);
      x++;
    }
  });

  var x = 0;
  $.each(districtIndex, function(d) {
    districtIndex[d] = x;
    matrix[x] = [];
    for (c = 0; c<Object.keys(districtIndex).length; c++) { 
      matrix[x].push(0);
    }
    districts[x] = {
      index: x,
      name:d,
      relationships: [],
    }
    x++;
  })

  var updateMatrix = function(from, to, rowIndex, columnIndex) {
    if (displayType == 'give') {
      to = districtIndex[columnIndex];
    } else {
      from = districtIndex[columnIndex];
    }
    var minval = .1;

    matrix[from][to]+= 1 + minval;
    if (displayType == 'both') {
      matrix[to][from] = matrix[from][to];
    } else {
      matrix[to][from] = minval;      
    }
    if (districts[from].relationships[to] === undefined) { 
      districts[from].relationships[to] = [rowIndex];  
    } else {
      districts[from].relationships[to].push(rowIndex);
    }
  }

  $.each(data, function(rowIndex, row) {
    if (row.give) {
      var from;
      var to;
      if (displayType == 'give') {
        from = districtIndex[row.give];
      } else {
        to = districtIndex[row.give];
      }
      if (row.get) {
        updateMatrix(from, to, rowIndex, row.get);
      }
      var x = 2;
      while (row['get_'+x]) {
        updateMatrix(from, to, rowIndex, row['get_'+x]);
        x++;
      }
    }
  });
  // console.log(JSON.stringify(matrix).replace(/],/g, "],\n"));
  drawGraph();
}

//Find angles for district labels
var startAngle = function(i) {
  return chord.groups()[i].startAngle;
}

var endAngle = function(i) {
  return chord.groups()[i].endAngle;
}

var resize = function() {
  var width = $('#viz-container').width();
  var height = $('#content').height();
  graphSize = Math.min(width, height); //use the smaller dimension
  $('#viz-container svg').attr("width", graphSize)
    .attr("height", graphSize)
  svg.attr("transform", "translate(" + graphSize / 2 + "," + graphSize / 2 + ")")

  var innerRadius = graphSize * 0.41 - labelSize;
  var outerRadius = innerRadius * 1.1;

  svg.selectAll(".chord-group")
    .data(chord.groups)
    .attr("d", d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius))
  
  svg.selectAll(".chord")
    .data(chord.chords)
    .attr("d", d3.svg.chord().radius(innerRadius))

}

var initGraph = function() {
  $('.loading').hide();
  $('#controls').show();
  var width = $('#viz-container').width();
  var height = $('#content').height();
  graphSize = Math.min(width, height); //use the smaller dimension
  svg = d3.select("#viz-container").append("svg")
    .attr('id', 'chordGraph')
    .attr("width", graphSize)
    .attr("height", graphSize)
    .append("g")
    .attr("transform", "translate(" + graphSize / 2 + "," + graphSize / 2 + ")")
    .on('mousemove', function() {
      if (tooltip.style('display') != 'none') {
        moveTooltip();
      }
    })
    .on('mouseout', hideTooltip)
    
  info = d3.select('#info')//.append('div').attr('id', 'info');

  $('#controls input').on('change', redrawGraph);
  $(window).on('resize', resize);
  tooltip = d3.select('#content').append('div').attr('id', 'tooltip');
}

var redrawGraph = function() {
  matrix = [];
  districtIndex = {};
  districts = [];
  svg.selectAll("*").remove()
  createMap(rows);
}

var moveTooltip = function() {
  tooltip.style('top', d3.event.pageY +5 +'px');
  tooltip.style('left', d3.event.pageX + 5 + 'px');
}

var showTooltip = function(text) {
  moveTooltip();
  tooltip.style('display', 'block');
  tooltip.html(text);
}

var hideTooltip = function() {
  tooltip.style('display', 'none');
}

var drawGraph = function() {
  var innerRadius = graphSize * 0.41 - labelSize;
  var outerRadius = innerRadius * 1.1;

  var fade = function(opacity) {
    return function(g, i) {
      svg.selectAll(".chords path")
        .filter(function(d) { return d.source.index !== i && d.target.index !== i; })
        .transition()
        .style("opacity", opacity);
    };
  }

  chord = d3.layout.chord()
    .padding(0.02)
    .sortSubgroups(d3.descending)
    .matrix(matrix);

  var fill = d3.scale.category20()
    // .domain(d3.range(13))
    // .range(d3.scale.category20);

  svg.append("g").attr('class', 'chord-groups').selectAll("path")
    .data(chord.groups)
    .enter().append("path")
    .attr('class', 'chord-group')
    .style("fill", function(d) { return fill(d.index); })
    .style("stroke", function(d) { return fill(d.index); })
    .attr("d", d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius))
    .on("mouseover", function(d, i) {
      showTooltip(districts[i].name);
      fade(0.1)(d, i);
    })
    .on("mouseout", fade(1))

    //Adding district names to arcs
    svg.append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(chord.groups)
      .enter().append("text")
      .each(function(d, i) { d.angle = (startAngle(i) + endAngle(i)) / 2; })
      .attr("dy", ".35em")
      .attr("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
      .attr("transform", function(d) {
        //console.log('meow', outerRadius);
        return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
            + "translate(" + (outerRadius + 10) + ")"
            + (d.angle > Math.PI ? "rotate(180)" : "");
      })
      .text(function(d, i) { return districts[i].name; });


  svg.append("g")
    .attr("class", "chords")
    .selectAll("path")
    .data(chord.chords)
    .enter().append("path")
    .attr("class", "chord")
    .attr("d", d3.svg.chord().radius(innerRadius))
    .style("fill", function(d) { return fill(d.target.index); })
    .style("opacity", 1)
    .on("click", function(d, i) {
      var relationship = districts[d.source.index].relationships[d.target.index];
      var details = "<h4>"+districts[d.source.index].name + ' to ' + districts[d.target.index].name+"</h4>";
      $.each(relationship, function(index, rowid){
        var row = rows[rowid];
        details += row.when+ ' - '+row.specificwhat+"<br/>";
      })
      info.html(details);
    })

}

$(function() {
  var tabletop = Tabletop.init( { 
    key: '1XkV1ePpq5piIfonZWShm7SZd78lqKvvgSP_u2hl54ic', 
    callback: function(data) { 
      initGraph();
      createMap(data);
    },
    simpleSheet: true,
    debug:true
  } )
})
