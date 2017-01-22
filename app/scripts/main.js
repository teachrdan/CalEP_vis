// TODO push to my branch
// TODO test on github page

(function () {
    "use strict";
    var accounts = {};
    var accountName = '';
    var campaigns = {};
    var chord = {};
    var collaborationIDs = {};
    var displayType = 'normalized';
    var districts = {};
    var districtIndex = {};
    var docData = {};
    var edEvents = {};
    var info = {};
    var labelSize;
    var matrix = [];
    var maxLabel = '';
    var rows = [];
    var svg = {};
    var tooltip = {};

    var colors = ['rgb(166,206,227)','rgb(31,120,180)','rgb(178,223,138)','rgb(51,160,44)','rgb(251,154,153)','rgb(227,26,28)','rgb(253,191,111)','rgb(255,127,0)','rgb(202,178,214)','rgb(106,61,154)'];
    var nicetypes = {
        'give': 'Hosted',
        'get': 'Attended',
        'mutual': 'Mutual'
    };

    // TODO reset maxLabel to 0 between reloads
    var addDistrict = function(d) {
        if (d) {
            //Find longest label
            if (d.length > maxLabel.length) {
                maxLabel = d;
            }

            // TODO recreate district index
            if  (!districtIndex[d]) {
                districtIndex[d] = 1;
            }
        }
    };

    var createMap = function() {
        $.each(accounts, function(key, account) {
            addDistrict(account.name);
        });

        //set labelSize to 1/2 of longest label length
        var labelTest = svg.append('text').attr('id', 'maxLabel').text(maxLabel);
        labelSize = $('#maxLabel')[0].getBBox().width;
        labelTest.remove();
        var x = 0;

        $.each(Object.keys(districtIndex).sort(), function(i, name) {
            matrix = matrix.concat(x, x+1, x+2);
            districtIndex[name] = {
                name: name,
                relationships: {
                    'give': {},
                    'get': {},
                    'mutual': {}
                },
                counts: {}
            };

            $.each(['give', 'get', 'mutual'], function(i, type) {
                districtIndex[name][type] = x;
                districtIndex[name].counts[type] = {
                    count: 0,
                    participants: 0,
                    districts: {}
                };

                // create one empty array for each district
                matrix[x] = [];
                // inside each empty district array, create 3 arrays with a value 0 (for now)
                    // to count the number of give/get/mutual xps between each district
                for (var c = 0; c < Object.keys(districtIndex).length; c++) {
                    matrix[x].push(0);
                    matrix[x].push(0);
                    matrix[x].push(0);
                }

                // inside the districts object, track the district index position, name and type
                districts[x] = {
                    index: x, // TODO remove index tracking on accounts collection
                    name: name,
                    type: type,
                };

                x++;
            });
        });

        // populate matrix of relationships between districts
        var updateMatrix = function(fromId, toId, rowIndex, count, mutual) {
            if (fromId === toId) { return; } //Don't count self-relations // TODO probably refactor out

            var addRelation = function(a, b, type) {
                var value = {id: rowIndex, type: type, count: count};
                var district = districtIndex[accounts[a].name];
                var district2 = districtIndex[accounts[b].name];
                if (district.relationships[type][district2.name] === undefined) {
                    district.relationships[type][district2.name] = [value];
                    district.counts[type].districts[district2.name] = {
                        count: 0,
                        participants: 0
                    };
                } else {
                    district.relationships[type][district2.name].push(value);
                }
            };

            if (!mutual) {
                matrix[accounts[toId].index][accounts[fromId].index] ++;
                matrix[accounts[fromId].index][accounts[toId].index] += displayType === 'normalized' ?  1/count : 1;
                addRelation(fromId, toId, 'give');
                addRelation(toId, fromId, 'get');
            } else {
                matrix[toId][fromId] += 1/count;
                addRelation(fromId, toId, 'mutual');
            }
        };

        $.each(edEvents, function(eventName, event) {
            console.log("eventName, event", eventName, event);
            var gets = event.attended;
            var fromId = event.host; // NOTE: will be blank if mutual: true
            var from = accounts[event.host].name;
            // TODO check this math
            districtIndex[from].counts.give.count += 1;
            districtIndex[from].counts.give.participants += gets.length;
            // TODO account for mutuals here?

            var idx = 0; // TODO probably refactor out
            $.each(gets, function(idx, account) {
                var to = accounts[account].name;
                var toId  = account;
                districtIndex[to].counts.get.count++;
                districtIndex[to].counts.get.participants += gets.length;
                updateMatrix(fromId, toId, idx, gets.length);
                districtIndex[from].counts.give.districts[to].count++;
                districtIndex[from].counts.give.districts[to].participants += gets.length;
            });
            console.log("districtIndex", districtIndex);

            // TODO refactor to account for this code
            // $.each(gets, function(i, account) {
            //     var to = districtIndex[value].get;
            //     districtIndex[value].counts.get.count++;
            //     districtIndex[value].counts.get.participants += gets.length;
            //
            //     updateMatrix(from, to, rowIndex, gets.length);
            //     districtIndex[row.give].counts.give.districts[value].count++;
            //     districtIndex[row.give].counts.give.districts[value].participants += gets.length;
            // });
            // } else { //Process as a mutual give/get
            //     $.each(gets, function(i, get1) {
            //         districtIndex[get1].counts.mutual.count++;
            //         districtIndex[get1].counts.mutual.participants += gets.length;
            //         $.each(gets, function(i, get2) {
            //             var from = districtIndex[get1].mutual;
            //             var to = districtIndex[get2].mutual;
            //             updateMatrix(from, to, rowIndex, gets.length, true);
            //             if (from !== to) {
            //                 districtIndex[get1].counts.mutual.districts[get2].count++;
            //                 districtIndex[get1].counts.mutual.districts[get2].participants += gets.length;
            //             }
            //         });
            //     });
            // }
        });

        drawGraph();
    };

    //Find angles for district labels (1/2)
    var startAngle = function(i) {
        return chord.groups()[i].startAngle;
    };

    //Find angles for district labels (2/2)
    var endAngle = function(i) {
        return chord.groups()[i].endAngle;
    };

    var redrawGraph = function() {
        displayType = $('input:radio[name=display-type]:checked').val();
        matrix = [];
        maxLabel = '';
        districtIndex = {};
        districts = {};
        svg.selectAll('*').remove();
        createMap();
        $('#info').hide();
    };

    var moveTooltip = function() {
        tooltip.style('top', d3.event.pageY +5 +'px');
        tooltip.style('left', d3.event.pageX + 5 + 'px');
    };

    var showTooltip = function(text) {
        moveTooltip();
        tooltip.style('display', 'block');
        tooltip.html(text);
    };

    var hideTooltip = function() {
        tooltip.style('display', 'none');
    };

    var showInfo = function(title, relationships, type, isChord) {
        $('#info .panel-title').html(title);
        $('#info .list-group').html('');

        $.each(relationships, function(index, r) {
            showRow(r.id, r.type);
        });

        $('#info').css('display', 'flex');
        $('.tab-content .list-group:empty').html('<li class="list-group-item"><div class="list-group-item-text">No experiences</div></li>');
        $('#info .nav-tabs li a[href="#' + type + 's"]').tab('show');
        $('#info .nav-tabs>li').toggle(!isChord);
    };

    var showRow = function(rowIndex, type) {
        var row = rows[rowIndex];
        var subtitle = row.when + ' - ' + row.specificwhat;

        if (districtIndex[row.give] === undefined) {
            subtitle += ' (Mutual)';
        }

        var details = '';
        details += row._origGive ? '<div>Host: '+row._origGive+'</div>' : '';
        details += 'Participants: ' + getGets(row).join(', ');
        var surveyLink = (row.survey && row.survey.match(/^http/i)) ? ' <a class="btn btn-default btn-sm" target="_blank" href="' + row.survey + '"> Survey</a>' : '';
        // TODO see if there will be a link
        // var onlineSpaceLink = (row.onlinespace && row.onlinespace.match(/^http/i)) ? ' <a class="btn btn-default btn-sm" target="_blank" href="' + row.onlinespace + '"> Online Space</a>' : '';
        var buttons = surveyLink + onlineSpaceLink;
        $('#info #' + type + 's .list-group').append(
            '<li class="row-info list-group-item">' +
            '<span class="pull-right btn-group">' + buttons + '</span>' +
            '<h4 class="list-group-item-heading">' + subtitle + '</h4>' +
            '<div class="list-group-item-text">' + details + '</div>' +
            '</li>'
        );
    };

    var drawGraph = function() {
        var getDistrict = function(d) {
            return districtIndex[districts[d.index].name];
        };

        var fade = function(opacity, district) {
            return function(g, i) {
                svg.selectAll('.chords path')
                    .filter(function(d) {
                        if (district) {
                            return districts[d.source.index].name !== districts[g.index].name && districts[d.target.index].name !== districts[g.index].name;
                        } else if (g.source) {
                            return d.source.index !== g.source.index || d.target.index !== g.target.index;
                        } else {
                            return d.source.index !== i && d.target.index !== i;
                        }
                })
                .transition()
                .style('opacity', opacity);
            };
        };

        var fill = function(d) {
            var district = districts[d.index];
            var color = colors[Object.keys(districtIndex).indexOf(district.name)];
            return color;
        };

      chord = d3.layout.chord()
        .padding(0.02)
        .sortChords(d3.descending)
        .sortSubgroups(d3.descending)
        .matrix(matrix);

      svg.append('g').attr('class', 'district-groups').selectAll('path')
        .data(
            chord.groups().filter(function(d) {
                return districts[d.index].type === 'give';
            })
        )
        .enter()
        .append('path')
        .attr('class', 'district-group')
        .style('fill', function(d) { return fill(d); })
        .style('stroke', function(d) { return fill(d); });

        //Defining arcs / chord-groups
        svg.append('g').attr('class', 'chord-groups').selectAll('path')
            .data(chord.groups)
            .enter().append('path')
            .attr('class', 'chord-group')
            .style('fill', function(d) { return fill(d); })
            .style('stroke', function(d) { return fill(d); })
            .on('mouseover', function(d, i) {
                var district = getDistrict(d);
                var type = districts[d.index].type;
                var nicetype = nicetypes[type];
                var count = district.counts[type].count;
                var tooltip = district.name + ' ' + nicetype + ' '+ count + (type === 'mutual' ? ' Mutual' : '') + ' Experience' + (count === 1 ? '' : 's');// with '+district.counts[type].participants+' participants';
                showTooltip(tooltip);
                fade(0.1)(d, i);
            })
            .on('mouseout', fade(1));

        //Chords are defined
        svg.append('g')
            .attr('class', 'chords')
            .selectAll('path')
            .data(chord.chords)
            .enter().append('path')
            .attr('class', 'chord')
            .style('fill', function(d) {
                var district = districts[d.source.index];
                if (district.type === 'get') {
                    return fill(d.target);
                } else if (district.type === 'mutual') {
                    return '#999';
                } else {
                    return fill(d.source);
                }
            })
            .style('opacity', 1)
            .on('click', function(d) {
                var from = districts[d.source.index].type === 'give' ? 'source' : 'target';
                var to = districts[d.source.index].type === 'give' ? 'target' : 'source';
                var sourceDistIndex = d[from].index;
                console.log("sourceDistIndex", sourceDistIndex);
                var sourceDistrict = getDistrict(d[from]);
                console.log("sourceDistrict", sourceDistrict);
                var targetDistrict = getDistrict(d[to]);
                var type = districts[sourceDistIndex].type;

                var title = '';
                if (type === 'mutual') {
                    title = 'Mutual between '+ sourceDistrict.name + ' and '+ targetDistrict.name;
                } else {
                    title = sourceDistrict.name + ' to '+ targetDistrict.name;
                }
                showInfo(title, sourceDistrict.relationships[type][targetDistrict.name], type, true);
            })
            //Tooltip on chords shows 'From District X to District Y'
            .on('mouseover', function(d, i) {
                var from = districts[d.source.index].type === 'give' ? 'source' : 'target';
                var to = districts[d.source.index].type === 'give' ? 'target' : 'source';
                var sourceDistIndex = d[from].index;
                var sourceDistrict = getDistrict(d[from]);
                var targetDistrict = getDistrict(d[to]);
                var tooltip = '';
                // TODO fix this
                var counts = sourceDistrict.counts[districts[sourceDistIndex].type].districts[targetDistrict.name];

                if (districts[sourceDistIndex].type === 'mutual') {
                    tooltip = sourceDistrict.name + ' and ' + targetDistrict.name;
                } else {
                    tooltip = sourceDistrict.name + ' to  ' + targetDistrict.name;
                }

                tooltip += '<br>' + counts.count + (districts[sourceDistIndex].type === 'mutual' ? ' Mutual': '') + ' Experience' + (counts.count === 1 ? '': 's'); // +' with '+counts.participants+' Total Participants';

                //Old tooltip showing # of gives / gets - keep for debug mode?
                // var tooltip = districts[sourceDistIndex].name + ' to ' + districts[targetDistIndex].name
                //   + ': ' + roundToTwo(matrix[sourceDistIndex][targetDistIndex])
                //   + '</br>' + districts[targetDistIndex].name + ' to ' + districts[sourceDistIndex].name
                //   + ': ' + roundToTwo(matrix[targetDistIndex][sourceDistIndex]);
                showTooltip(tooltip);
                fade(0.1)(d, i);
            })
            .on('mouseout', fade(1));

        //Adding district names to arcs
        svg.append('g')
            .attr('class', 'sublabels')
            .selectAll('text')
            .data(chord.groups)
            .enter().append('text')
            .attr('class', 'glyphicon sublabel')
            .attr('pointer-events', 'none')
            .each(function(d) {
                d.angle = (startAngle(d.index) + endAngle(d.index)) / 2;
            })
            .attr('dy', '.4em')
            .attr('fill', function(d) {
                return d3.rgb(fill(d)).darker(3);
            });

        //Adding district names to arcs
        svg.append('g')
            .attr('class', 'labels')
            .selectAll('text')
            .data(
                chord.groups().filter(function(d) {
                    return districts[d.index].type === 'give';
                })
            )
            .enter().append('text')
            .attr('class', 'district-label')
            .each(function(d) {
                d.center = (d.startAngle + endAngle(d.index+2)) / 2;
            })
            .attr('dy', '.35em')
            .attr('text-anchor', function(d) { return d.center > Math.PI ? 'end' : null; })
            .text(function(d) { return districts[d.index].name; });

      d3.selectAll('.district-label, .district-group')
        .on('mouseover', function(d, i) {
            var district = getDistrict(d);
            var tooltip = district.name + ' - ' + (district.counts.give.count + district.counts.get.count + district.counts.mutual.count) + ' Experiences';
            showTooltip(tooltip);
            fade(0.1, true)(d, i);
        })
        .on('mouseout', fade(1, true));

      //Click to add arc / district data to side of page
      d3.selectAll('.sublabel, .chord-group, .district-group, .district-label')
        .on('click', function(d) {
            var district = getDistrict(d);
            var rowIndexes = {};
            $.each(district.relationships, function(type, list) {
                $.each(list, function(relatedDistrictIndex, relationship) {
                    $.each(relationship, function(index, r) {
                        rowIndexes[r.id] = {id: r.id, type: type};
                    });
                });
            });

            showInfo(district.name, rowIndexes, districts[d.index].type);
        });

      //Now apply all the properties that depend on scale
      resize();
    };

    var resize = function() {
        var width = $('#viz-container').width();
        var height = $('#content').height();
        var graphSize = Math.min(width, height);
        $('#viz-container svg').attr('width', graphSize)
            .attr('height', graphSize);
        svg.attr('transform', 'translate(' + graphSize / 2 + ',' + graphSize / 2 + ')');

        var outerOuterRadius = graphSize * 0.5 - labelSize - 10;
        var outerInnerRadius = outerOuterRadius * 0.99;
        var innerOuterRadius = outerInnerRadius * 0.98;
        var innerInnerRadius = innerOuterRadius * 0.94;
        var iconsize = roundToTwo((innerOuterRadius - innerInnerRadius) * 0.7);

        svg.selectAll('.chord-group')
            .attr('d', d3.svg.arc().innerRadius(innerInnerRadius).outerRadius(innerOuterRadius));

            svg.selectAll('.district-group')
            .attr('d', function(d) {
                return d3.svg.arc()
                    .startAngle(startAngle(d.index))
                    .endAngle(endAngle(d.index+2))
                    .innerRadius(outerInnerRadius)
                    .outerRadius(outerOuterRadius)();
            });

        svg.selectAll('.chord')
            .attr('d', d3.svg.chord().radius(innerInnerRadius));

        svg.selectAll('.sublabel')
            .attr('font-size', iconsize + 'px')
            .attr('transform', function(d) {
                return 'rotate(' + (d.angle * 180 / Math.PI - 90) + ')' + 'translate(' + (innerInnerRadius+roundToTwo((innerOuterRadius - innerInnerRadius) * 0.15)) + ')';
            })
            .text(function(d) {
                if ((d.endAngle - d.startAngle) * innerInnerRadius > iconsize) {
                    return districts[d.index].type === 'give' ? '' : districts[d.index].type === 'get' ? '' : '';
                }
            });

        svg.selectAll('.district-label')
            .attr('transform', function(d) {
                return 'rotate(' + (d.center * 180 / Math.PI - 90) + ')' + 'translate(' + (outerOuterRadius + 5) + ')' + (d.center > Math.PI ? 'rotate(180)' : '');
            });
    };

    var loadWorksheet = function() {
        var currSheet = $('.worksheets').val();

        // Get all account IDs and names and event names
        if (currSheet === 'CALLI - 4-6 Language Development') { // TODO refactor out if statement
            docData[currSheet].elements.forEach(function(row) {
                // create a collection of all schools (accounts)
                accounts[row.accountid] = {
                    name: row.account
                };

                // create a collection of all campaigns
                campaigns[row.campaignid] = {
                    name: row.campaign,
                    description: row.campaigndescription
                };

                // create a collection of all educational events
                edEvents[row.date + row.surveyname.substring(11)] = {
                    attended: [], // array of IDs of all attending districts
                    date: row.date,
                    essentialQuestions: row.essentialquestions,
                    host: '',
                    mutual: false,
                    year: row.academicyear,
                };
            });

            var index = 0;
            $.each(accounts, function(key, value) {
                // add an index position for each school
                value.index = index;
                index++;
            });
            console.log("accounts", accounts);

            // populate each event with give and get and mutual info
            var currEvent = {};
            docData[currSheet].elements.forEach(function(row, i) {
                currEvent = edEvents[row.date + row.surveyname.substring(11)];
                if (row.hostattendmutual === 'Hosted') {
                    currEvent.host = row.accountid;
                } else if (row.hostattendmutual === 'Attended') {
                    currEvent.attended.push(row.accountid);
                } else if (row.hostattendmutual === 'Mutual') {
                    currEvent.mutual = true;
                    currEvent.attended.push(row.accountid);
                }
            });
        }

        // TODO refactor
        // $.each(docData, function(i, row) {
        //     row._origGive = row.give;
        //     row.give = $.trim(row.give);
        //     row.get = $.trim(row.get);
        //     var x = 2;
        //
        //     while (row['get_' + x]) {
        //         row['get_' + x] = $.trim(row['get_' + x]);
        //         x++;
        //     }
        // });

        redrawGraph();
    };

    var initGraph = function() {
        $('.loading').hide();
        $('#controls').css('display', 'flex');
        svg = d3.select('#viz-container').append('svg')
            .attr('id', 'chordGraph')
            .append('g')
            .on('mousemove', function() {
                if (tooltip.style('display') !== 'none') {
                    moveTooltip();
                }
            })
            .on('mouseout', hideTooltip);

        info = d3.select('#info'); //.append('div').attr('id', 'info');

        $('.worksheets').on('change', loadWorksheet);
        $('#controls input').on('change', redrawGraph);
        $(window).on('resize', resize);
        tooltip = d3.select('#content').append('div').attr('id', 'tooltip');
    };

    var roundToTwo = function(num) {
        return +(Math.round(num + 'e+2')  + 'e-2');
    };

    $(function() {
        var tabletop;
        var fetchData = function() {
            tabletop = Tabletop.init({
                key: '187AL-Ve6sOLP_-j58xk8ANHi1cZfheDzDSMInC4snOg',
                callback: function(data) {
                    // TODO refactor
                    // if (rows[0]) {
                    //     return;
                    // }

                    docData = data;
                    var sheetNames = Object.keys(docData);
                    $.each(sheetNames, function(i, sheetName) {
                        $('.worksheets')
                            .append('<option>' + sheetName + '</option>');
                    });
                    initGraph();
                    loadWorksheet();

                    // rows = docData;
                    createMap(); // TODO probably move this
                },
                debug: true
            });
        };

        var checkData = function() {
            // TODO refactor
            // if (rows[0]) {
            //     return;
            // }

            fetchData();
            // TODO refactor
            // setTimeout(checkData, 10000);
        };

        checkData();
    });
}());
