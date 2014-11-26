var districts = {};
var matrix = [];
var blank = [];

var addDistrict = function(d) {
  if (d) {
    districts[d] = 1;
  }
}

var createMap = function(data) {
  $.each(data.Sheet1.elements, function(i, row) {
    addDistrict(row.give);
    addDistrict(row.get);
    var x = 2;
    while (row['get_'+x]) {
      addDistrict(row['get_'+x]);
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
  // console.log(districts);
  console.log(JSON.stringify(matrix));
}

var tabletop = Tabletop.init( { 
  key: '1XkV1ePpq5piIfonZWShm7SZd78lqKvvgSP_u2hl54ic', 
  callback: createMap
} )
