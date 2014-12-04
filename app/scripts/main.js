var svg, info, tooltip, chord, height, width, labelSize; 
var districts = [];
var matrix = [];
var districtIndex = {};
var rows = [];
var displayType = 'give';
var maxLabel = "";

var addDistrict = function(d) {
  if (d) {
    d = $.trim(d);

    if (displayType == 'districts' && (d == 'Expert' || d == 'Neutral - CEP' || d == 'Neutral - WestEd')) { 
      return; 
    }
    if (d.length > maxLabel.length) { maxLabel = d; } //Find longest label

    if (! districtIndex[d]) {
      districtIndex[d] = 1;
    }
  }
}

var createMap = function(data) {
  rows = data;

  $.each(data, function(i, row) {
    if ($.trim(row.strand) == 'Expert') {
      row.give = 'Expert';
    }
    addDistrict(row.give);
    addDistrict(row.get);
    var x = 2;
    while (row['get_'+x]) {
      addDistrict(row['get_'+x]);
      x++;
    }
  });

  //set labelSize to 1/2 of longest label length
  labelTest = svg.append('text').attr('id', 'maxLabel').text(maxLabel);
  labelSize = $('#maxLabel').width()/2+2;
  labelTest.remove();

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
      relationships: {},
      gives:0,
      gets: 0
    }
    x++;
  })

  var updateMatrix = function(from, to, rowIndex, count) {
    if (from == to) { return; } //Don't count self-relations

    var minval = 0;
    var val = 1;
    if ($('#districtFraction').is(':checked') && count) {
      val = 1/count;
    }

    matrix[from][to]+= val + minval;
    if (displayType == 'both') {
       matrix[to][from] += val + minval;
    } else {
      matrix[to][from] += minval;      
    }
    if (districts[from].relationships[to] === undefined) { 
      districts[from].relationships[to] = [rowIndex];  
    } else {
      districts[from].relationships[to].push(rowIndex);
    }
    districts[from].gives += val;
    districts[to].gets += val;
  }

  $.each(data, function(rowIndex, row) {
    var gets = [];
    if (row.get) {
      gets.push(row.get);
    }
    var x = 2;
    while (row['get_'+x]) {
      gets.push(row['get_'+x]);
      x++;
    }

    if (row.give && districtIndex[row.give] !== undefined) {
      var from = districtIndex[row.give];
      var to = districtIndex[row.get];

      if (displayType == 'get') {
        to = districtIndex[row.give];
      }
      $.each(gets, function(i, value){
        if (displayType == 'get') {
          from = districtIndex[value];
        } else {
          to = districtIndex[value];
        }
        updateMatrix(from, to, rowIndex, gets.length);        
      })
    } else { //Process as a mutual give/get
      $.each(gets, function(i, get1){
        $.each(gets, function(i, get2){
          from = districtIndex[get1];
          to = districtIndex[get2];
          if (displayType == 'get') {
            from = districtIndex[get2];
            to = districtIndex[get1];
          }
          updateMatrix(from, to, rowIndex, gets.length-1);  
        })
      })
    }
  });
  //console.log(JSON.stringify(matrix).replace(/],/g, "],\n"));
  drawGraph();
}

//Find angles for district labels (1/2)
var startAngle = function(i) {
  return chord.groups()[i].startAngle;
}

//Find angles for district labels (2/2)
var endAngle = function(i) {
  return chord.groups()[i].endAngle;
}

var resize = function() {
  var width = $('#viz-container').width();
  var height = $('#content').height();
  graphSize = Math.min(width, height);
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

  svg.selectAll(".labels text")
    .data(chord.groups)
    .attr("transform", function(d) {
      return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
        + "translate(" + (outerRadius + 10) + ")"
        + (d.angle > Math.PI ? "rotate(180)" : "");
    })
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
  displayType = $("input:radio[name=display-type]:checked").val();
  matrix = [];
  maxLabel = "";
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
        .filter(function(d) { 
          if (g.source) {
            return d.source.index !== g.source.index || d.target.index !== g.target.index;
          } else {
            return d.source.index !== i && d.target.index !== i; 
          }
        })
        .transition()
        .style("opacity", opacity);
    };
  }

  chord = d3.layout.chord()
    .padding(0.02)
    .sortChords( d3.descending ) 
    .sortGroups(d3.descending)
    .sortSubgroups(d3.descending)
    .matrix(matrix);

  var fill = d3.scale.category20()

  //Defining arcs / chord-groups
  svg.append("g").attr('class', 'chord-groups').selectAll("path")
    .data(chord.groups)
    .enter().append("path")
    .attr('class', 'chord-group')
    .style("fill", function(d) { return fill(d.index); })
    .style("stroke", function(d) { return fill(d.index); })
    .attr("d", d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius))
    .on("click", function(d, i) {
      console.log('districts[d.index].name', districts[d.index].name);
      var district = districts[d.index];
      var details = "<h4>" + district.name + "</h4>";
      $.each(district.relationships, function(index, relationship) {
        $.each(relationship, function(index, rowid){
          var row = rows[rowid];
          details += row.when + ' - ' + row.specificwhat + "<br/>";
        })
      })
      info.html(details);
    })
    .on("mouseover", function(d, i) {
      var tooltip = districts[i].name 
        + "<br/>Gives: "+roundToTwo(districts[i].gives)
        + "<br/>Gets: "+roundToTwo(districts[i].gets);

      showTooltip(tooltip);
      fade(0.1)(d, i);
    })
    .on("mouseout", fade(1))
  
  //Chords are defined
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
      var details = "<h4>"+districts[d.source.index].name + ' to ' 
      + districts[d.target.index].name+"</h4>";
      $.each(relationship, function(index, rowid){
        var row = rows[rowid];
        details += row.when + ' - ' + row.specificwhat + "<br/>";
      })
      info.html(details);
    })
    //Tooltip on chords shows 'From District X to District Y'
    .on("mouseover", function(d, i) {
      var sourceDistIndex =  d.source.index;
      var targetDistIndex = d.target.index;
      
      //These are reversed if the display is 'get-oriented'
      if (displayType == 'get') {
        sourceDistIndex =  d.target.index;
        targetDistIndex = d.source.index;
      }
        
      var tooltip = districts[sourceDistIndex].name
        + " to " + districts[targetDistIndex].name + ": " + roundToTwo(matrix[sourceDistIndex][targetDistIndex])
        + "<br/>"+
        districts[targetDistIndex].name 
        + " to " + districts[sourceDistIndex].name + ": " + roundToTwo(matrix[targetDistIndex][sourceDistIndex])
      
      showTooltip(tooltip);
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
      return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
          + "translate(" + (outerRadius + 10) + ")"
          + (d.angle > Math.PI ? "rotate(180)" : "");
    })
    .text(function(d, i) { return districts[i].name; });
}

var roundToTwo = function(num) {    
    return +(Math.round(num + "e+2")  + "e-2");
}

$(function() {
  var tabletop;
  var fetchData = function() {
    tabletop = Tabletop.init( { 
      key: '1XkV1ePpq5piIfonZWShm7SZd78lqKvvgSP_u2hl54ic', 
      callback: function(data) { 
        if (rows[0]) { return; }
        initGraph();
        rows = data;
        createMap(data);
      },
      simpleSheet: true,
      debug:true
    } );
  }

  var checkData = function() {
    if (rows[0]) { return; }
    fetchData();
    setTimeout(checkData, 3500);
  }
  
  checkData();
})
