var districts = {};
var matrix = [];
var blank = [];

var createMap = function(data) {
  $.each(data.Sheet1.elements, function(i, row) {
    console.log(row);
    districts[row.give]=1;
    districts[row.get]=1;
    var x = 2;
    while (row['get_'+x]) {
      districts[row['get_'+x]];
      x++;
    }
  });

  var x = 0;
  $.each(districts, function(d) {
    districts[d] = ++x;
    blank[x] = 0;
  })
  $.each(data.Sheet1.elements, function(i, row) {
    var from = districts[row.give];
    if (! matrix[from]) {
      matrix[from] = $.merge([], blank); //use merge to create new array, not reference
    }
    matrix[from][districts[row.get]]++;
    var x = 2;
    while (row['get_'+x]) {
      matrix[from][districts[row['get_'+x]]]++;
      x++;
    }
  });
  console.log(districts);
  console.log(matrix);
}

var tabletop = Tabletop.init( { 
  key: '1XkV1ePpq5piIfonZWShm7SZd78lqKvvgSP_u2hl54ic', 
  callback: createMap
} )
