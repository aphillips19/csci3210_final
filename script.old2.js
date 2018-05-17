var NS = {}; // create namespace
NS.edgesfilepath = "sample_1401/edges.csv"
NS.nodesfilepath = "sample_1401/nodes.csv"
NS.width = 800
NS.height = 500
NS.threshold = 25;

NS.natCourt =
  {
    1401: [78, 79, 80, 81, 84, 86, 88, 89, 90],
    1402: [78, 79, 80, 81, 86, 88, 89, 90]
  }

function initialize() {
  // Load data and call main
  d3.csv(NS.edgesfilepath, function(edges) {
    NS.links = edges;
    d3.csv(NS.nodesfilepath, function(nodes) {
        NS.nodes = nodes
        main();
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

  // create the simulation
  var simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(function(d) { return d.id; }).distance(300))
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(NS.width / 2, NS.height / 2))
    .alphaTarget(1)
    .on("tick", ticked);
  
  // create link and node selections
  NS.svg = makeSVG()
  var node = NS.svg.append("g")
      .attr("class", "nodes")
    .selectAll(".node");
  var link = NS.svg.append("g")
      .attr("class", "links")
    .selectAll(".link");
  
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
    for(var i = 0; i < NS.nodes.length; i++) {
      var n = NS.nodes[i];
      if(NS.natCourt[x].includes(+n.id)) nodes.push(n);
    }
    for(var i = 0; i < NS.links.length; i++) {
      var l = NS.links[i];
      if(l.naturalCourt == x) { links.push(makeLink(l)) }
    }
    updateSim(nodes, links);
  }
  updateByNatCourt(1401);

  // Load nodes and edges

  d3.timeout(function() {
    updateByNatCourt(1402)
  }, 2000);
  d3.timeout(function() {
    updateByNatCourt(1401)
  }, 4000);

  // in a seperate function, determine which nodes and which edges should be present
  // add or remove, accordingly
  // then call updateSim with the new news and edges variables

  function updateSim(nodes, links) {
    // Apply the general update pattern to the nodes
    // (1)
    node = node.data(nodes, function(d) { return d.id;});
    // (2)
    //node.exit().remove();
    var nodeExit = node.exit().transition()
    nodeExit.select("text").attr("opacity", 0).attr("x", -20);
    nodeExit.remove();
    // (3)
    node = node.enter()
      .append("g")
        .attr("class", "node")
      .merge(node)
    node.append("circle")
        .attr("r", 15)
        .attr("fill", function(d) { return partisanColor(d); })
    node.append("text")
      .text(function(d) {
        return d.label;
      })
      .attr('opacity', 1)
      .attr('x', 6)
      .attr('y', 3);
    node.append("title")
      .text(function(d) { return d.label; });

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
          return "translate(" + d.x + "," + d.y + ")";
        })
  }

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
