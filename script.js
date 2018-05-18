var NS = {}; // create namespace
NS.edgesfilepath = "data/network.csv"
NS.nodeListfilepath = "data/nodes.csv"
NS.ncfilepath = "data/courts.json"
NS.width = 800
NS.height = 500
NS.threshold = 25;

  /*
NS.natCourt = {
    1401: [78, 79, 80, 81, 84, 86, 88, 89, 90],
    1402: [78, 79, 80, 81, 86, 88, 89, 90]
  }*/

function initialize() {
  // Load data and call main
  d3.csv(NS.edgesfilepath, function(edges) {
    NS.linksList = edges;
    d3.csv(NS.nodeListfilepath, function(nodes) {
      NS.nodeList = nodes
      d3.json(NS.ncfilepath, function(courts) {
        NS.natCourt = courts
        main();
      });
    });
  });
}

function makeSVG() {
  //Create SVG element
  var svg = d3.select(".graph")
        .append("svg")
        .attr("width", NS.width)
        .attr("height", NS.height);
  svg.append('defs');
  return svg;
}

function getJusticeLabel(name) {
  return 1;
}


function main() {
  // define scales
  // liberal+ conservative colors =  d3.scaleOrdinal(["#6495ed", "#fa8072"]);
  var edgeColor = function(d) {return ((d > 0) ? "#000" : "#c64841")}
  var edgeStroke = function(d) {return Math.sqrt(Math.abs(d))}
  var partisanColor = function(d) {return "#bbb"};
  var opacityScale = function(d) {
      var influence = Math.abs(d);
      if(influence > NS.threshold) return .5;
      else                         return .01;
  };
  var xCenter = function(d) {if(d % 2 == 0) return 0; else return NS.width}

  // define how markers are created with the proper color and opacity
  function marker(color, opacity) {
    var name = "arrowhead-" + color.replace("#", "") + "-" + opacity * 100;
    if(NS.svg.select("defs").select("#" + name).empty()) {
      NS.svg.select("defs").append("marker")
      .attr("id", name)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 10) // This sets how far back it sits, kinda
      .attr("refY", 0)
      .attr("markerWidth", function(d) { return 3 })
      .attr("markerHeight", function(d) { return 3 })
      .attr("xoverflow","visible")
      .attr("orient", "auto")
      //.attr("markerUnits", "userSpaceOnUse")
      .append("svg:path")
      .attr("d", "M0,-5L10,0L0,5")
      .style("fill", color)
      .style("opacity", opacity)
    }
    return "url(#" + name + ")";  
  }
  // create link and node selections
  NS.svg = makeSVG()
  var node = NS.svg.append("g")
      .attr("class", "nodes")
    .selectAll(".node");
  var link = NS.svg.append("g")
      .attr("class", "links")
    .selectAll(".link");

  // create selections for labels

  // create the simulation
  var simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(function(d) { return d.id; }).distance(300))
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(NS.width / 2, NS.height / 2))
    .force("x", d3.forceX().x(function(d) {
      return xCenter(d.id)
    }))
    .alphaTarget(1)
    .on("tick", ticked);
  
  
  // It is necessary to "construct" nodes an links from the initial data files
  // and then push them on to arrays rather than just pushing the actual nodes
  // or links. If we don't do this, d3 seems to edits the original data
  // structure (i.e. makes source and target an object with many properties)
  // which causes problems down the road. An added benefit of this construction
  // is that we can add properties like "partisanship" which aren't in the
  // original dataset.
  function makeLink(x) {
    return {source: x.source, target: x.target, type: x.type, value: x.value}
  }

  // However, it seems that this behavior is actually wanted for the nodes,
  // because it allows a node to stay in its place when new ones are added
  /*
  function makeNode(x) {
    return {id: x.id, label: x.label, party: "liberal"}
  }*/
  
  function updateByNatCourt (x) {
    var nodes = [], links = [];
    for(var i = 0; i < NS.nodeList.length; i++) {
      var n = NS.nodeList[i];
      // reset position to center if not yet set
      if(NS.natCourt[x].includes(+n.id)) {
        if(n.x == undefined) {
          // instead of blindly setting it like this, find a way to set it 
          // at the location of the node that just exited! may have to find
          // a way to do this within the update function itself.
          // Perhaps: keep track of the nodes that exit and pick one of those
          // positions to use.
          n.x = xCenter(n.id)
          n.y = NS.height/2;
        }
        nodes.push(n);
      }
    }
    for(var i = 0; i < NS.linksList.length; i++) {
      var l = NS.linksList[i];
      if(l.type == "CL" && l.naturalCourt == x) { links.push(makeLink(l)) }
    }
    links.sort(); // 
    /*
    var thresholdIndex = links.length / 3;
    var frontCounter = 0;
    var endCounter = links.length - 1;
    var lastUpdated = -1;
    while (frontCounter + (links.length - 1 - endCounter) < thresholdIndex) {
        if (Math.abs(links[frontCounter].value) > Math.abs(links[endCounter].value)) {
            frontCounter++;
            lastUpdated = -1;
        }
        else {
            endCounter--;
            lastUpdated = 1;
        }
    }
    if (lastUpdated == 1) {
        NS.threshold = Math.abs(links[endCounter].value);
    }
    else {
        NS.threshold = Math.abs(links[frontCounter].value);
    }
    for (l in links) {
      console.log(links[l].value);
    }*/
    var absValues = [];
    for (l in links) {
      absValues.push(Math.abs(links[l].value));
    }
    absValues.sort((a, b) => a - b);
    NS.threshold = absValues[Math.floor(absValues.length/9) * 8];
    console.log(absValues);
    console.log(NS.threshold);
    updateSim(nodes, links);
  }

  updateByNatCourt(1301);
  updateTitle();

  
  // loop through years!
   /*
  d3.timeout(function() {
    updateByNatCourt(1303);
    d3.timeout(function() {
      updateByNatCourt(1401);
    }, 4000);
  }, 4000); */

  // in a seperate function, determine which nodes and which edges should be present
  // add or remove, accordingly
  // then call updateSim with the new news and edges variables

  function updateSim(nodes, links) {
    // Apply the general update pattern to the nodes
    // bind the data
    node = node.data(nodes, function(d) { return d.id;})
    // exit, remove the g g
    node.exit().remove();
    // enter, append g 
    nodeEnter = node.enter()
      .append("g")
        .attr("class", "node")
    // enter, append circle and text
    nodeEnter.append("circle")
        .attr("r", 15)
        .attr("fill", function(d) { return partisanColor(d); })
    nodeEnter.append("text")
      .text(function(d) {
        return d.label;
      })
      .attr('opacity', 1)
      .attr('x', 6)
      .attr('y', 3);
    nodeEnter.append("title")
      .text(function(d) { return d.id; });
    node = nodeEnter.merge(node);

    // Apply the general update pattern to the links
    // (1)
    console.log("....")
    link = link.data(links, function(d) { /*console.log(d.source.id)*/; return d.source.id + "-" + d.target.id; });
    // (2)
    link.exit().remove();
    // (3)
    link = link.enter()
      .append("line")
      .attr("stroke-width", function(d) { return edgeStroke(d.value); })
      .attr("stroke-opacity",  function(d) {return opacityScale(d.value)})
      .each(function(d) {
        var color = edgeColor(d.value);
        var opacity = opacityScale(d.value);
        d3.select(this).style("stroke", color)
                       .attr("marker-end", marker(color, opacity));
      })
      .merge(link);
    // add update patterns for things like labels...
    
    // Update and restart the simulation
    simulation.nodes(nodes);
    simulation.force("link").links(links);
    simulation.alpha(1).restart();
  }

  function ticked() {
    // update link positions
    link
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });
    // update node positions
    node
        .attr("transform", function(d) {
          if(d.x < 100 && d.y < 100) console.log(d.id);
          return "translate(" + d.x + "," + d.y + ")";
        })
  }
  function title() {
    var title = d3.select(".title")
    title.append("text").attr("id", "courtname")
      .text("COURT NAME")
    title.append("text").text(": ")
    title.append("text").attr("id", "courtdate")
      .text("COURT DATE")
    title.append("text").text(" - ")
    title.append("text").attr("id", "civillibs")
      .text("CL?")

  }
  function updateTitle(val) {
    var title = d3.select(".title")
    title.select("#courtname").text(val)
  }
  
  title()
  function controls() {
    var data = d3.keys(NS.natCourt);
      console.log(data)
    var controls = d3.select(".controls")

    // prev button
    var prev = controls.append("text")
      .text("PREV ")
      .on("click",d => onButtonClick(-1))

    // select button
    var select = controls
      .append('select')
        .attr('class','select')
        .on('change',onchange)
    var options = select
      .selectAll('option')
      .data(data).enter()
      .append('option')
        .text(function (d) { return d; })

    // next button
    var next = controls.append("text")
      .text(" NEXT")
      .on("click", d => onButtonClick(1))

    // events
    function onchange() {
      val = select.property('value')
      console.log(val)
      updateByNatCourt(val)
      updateTitle(val)
    }

    function onButtonClick(incr) {
      val = select.property('value')
      i = data.indexOf(val) + incr
      select.property('value', data[i])
      select.call(onchange)
    }
  }


  controls();

  function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }

  function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
}

initialize()

// Custom force
/*
var forcePartiality = function() {
  var strength = constant(0.1),
      nodes,
      strengths,
      xz;

  if (typeof x !== "function") x = constant(x == null ? 0 : +x);

  function force(alpha) {
    for (var i = 0, n = nodes.length, node; i < n; ++i) {
      node = nodes[i], node.vx += (xz[i] - node.x) * strengths[i] * alpha;
    }
  }

  function initialize() {
    if (!nodes) return;
    var i, n = nodes.length;
    strengths = new Array(n);
    xz = new Array(n);
    for (i = 0; i < n; ++i) {
      strengths[i] = isNaN(xz[i] = +x(nodes[i], i, nodes)) ? 0 : +strength(nodes[i], i, nodes);
    }
  }

  force.initialize = function(_) {
    nodes = _;
    initialize();
  };

  force.strength = function(_) {
    return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initialize(), force) : strength;
  };

  force.x = function(_) {
    return arguments.length ? (x = typeof _ === "function" ? _ : constant(+_), initialize(), force) : x;
  };

  return force;
}*/
