var districts = [];
var matrix = [];
var blank = [];
var districtIndex = {};
var rows = [];

var addDistrict = function(d) {
  if (d) {
    if (! districtIndex[d]) {
      districtIndex[d] = 1;
    }
  }
}

var createMap = function(data) {
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
    blank[x] = 0;
    districtIndex[d] = x;
    districts[x] = {
      index: x,
      name:d,
      relationships: [],

    }
    x++;
  })

  $.each(data, function(i, row) {
    if (row.give) {
      var from = districtIndex[row.give];
      if (! matrix[from]) {
        matrix[from] = $.merge([], blank); //use merge to create new array, not reference
      }
      if (row.get) {
        var to = districtIndex[row['get']];
        matrix[from][to]++;
        if (districts[from].relationships[to] === undefined) { 
          districts[from].relationships[to] = [i];  
        } else {
          districts[from].relationships[to].push(i);
        }
      }
      var x = 2;
      while (row['get_'+x]) {
        var to = districtIndex[row['get_'+x]];
        matrix[from][to]++;
        if (districts[from].relationships[to] === undefined) { 
          districts[from].relationships[to] = [i];  
        } else {
          districts[from].relationships[to].push(i);
        }
        x++;
      }
    }
  });
  $.each(matrix, function(i, r) {
    if (r === undefined) {
      matrix[i] = $.merge([], blank);
    }
  })
  //console.log(JSON.stringify(matrix).replace(/],/g, "],\n"));
  initGraph();
}

var initGraph = function() {

  var fade = function(opacity) {
    return function(g, i) {
      svg.selectAll(".chord path")
        .filter(function(d) { return d.source.index !== i && d.target.index !== i; })
        .transition()
        .style("opacity", opacity);
    };
  };

  var chord = d3.layout.chord()
    .padding(0.02)
    .sortSubgroups(d3.descending)
    .matrix(matrix);

  var width = 750;
  var height = 750;
  var innerRadius = Math.min(width, height) * 0.41;
  var outerRadius = innerRadius * 1.1;

  //chosen from http://www.somacon.com/p142.php
  // var range = ["#556B2F", "#FAEBD7", "#7FFFD4", "#458B74", "#E0EEEE", "#838B8B", "#FFC0CB", "#8B7D6B", "#B8860B", "#00008B", "#8A2BE2", "#A52A2A", "#7FFF00"];

  var fill = d3.scale.category20()
    // .domain(d3.range(13))
    // .range(d3.scale.category20);
  var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

  var info = d3.select('body').append('div').attr('id', 'info');

  svg.append("g").selectAll("path")
    .data(chord.groups)
    .enter().append("path")
    .style("fill", function(d) { return fill(d.index); })
    .style("stroke", function(d) { return fill(d.index); })
    .attr("d", d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius))
    .on("mouseover", fade(0.1))
    .on("mouseout", fade(1))
    .on('click', function(d, i) {
      info.html(districts[d.index].name);
    });

  /*
  var ticks = svg.append("g").selectAll("g")
      .data(chord.groups)
    .enter().append("g").selectAll("g")
      .data(groupTicks)
    .enter().append("g")
      .attr("transform", function(d) {
        return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
            + "translate(" + outerRadius + ",0)";
      });

  ticks.append("line")
    .attr("x1", 1)
    .attr("y1", 0)
    .attr("x2", 5)
    .attr("y2", 0)
    .style("stroke", "#000");

  ticks.append("text")
    .attr("x", 8)
    .attr("dy", ".35em")
    .attr("transform", function(d) { return d.angle > Math.PI ? "rotate(180)translate(-16)" : null; })
    .style("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
    .text(function(d) { return d.label; });
  */

  svg.append("g")
    .attr("class", "chord")
    .selectAll("path")
    .data(chord.chords)
    .enter().append("path")
    .attr("d", d3.svg.chord().radius(innerRadius))
    .style("fill", function(d) { return fill(d.target.index); })
    .style("opacity", 1)
    .on("click", function(d, i) {
      var relationship = districts[d.source.index].relationships[d.target.index];
      var details = "<h3>"+districts[d.source.index].name + ' to ' + districts[d.target.index].name+"</h3>";
      $.each(relationship, function(i, d){
        var row = rows[d];
        details += row.when+ ' - '+row.specificwhat+"<br/>";
      })
      info.html(details);
    })

}

$(function() {
  var tabletop = Tabletop.init( { 
    key: '1XkV1ePpq5piIfonZWShm7SZd78lqKvvgSP_u2hl54ic', 
    callback: createMap,
    simpleSheet: true,
    debug:true
  } )
})
