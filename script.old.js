var NS = {}; // create namespace
NS.edgespath = "sample_1401/edges.csv"
NS.nodespath = "sample_1401/nodes.csv"
NS.width = 800
NS.height = 500
NS.threshold = 25;
NS.justice = {}

function initialize() {
  // Load data and call main
  d3.csv(NS.edgespath, function(edges) {
    NS.links = edges;
    d3.csv(NS.nodespath, function(nodes) {
        NS.nodes = nodes
        main();
    });
  });
}

function makeSVG() {
  //Create SVG element
  NS.svg = d3.select(".graph")
        .append("svg")
        .attr("width", NS.width)
        .attr("height", NS.height);
  NS.svg.append('defs')
}

function getJusticeLabel(name) {
  var res = null;
  NS.nodes.forEach(function(justice) {
    if(justice.label == name) {
      res = justice.label;
    }
  });
  return res;
}


function main() {
  makeSVG()

  // define scales
  // liberal+ conservative colors =  d3.scaleOrdinal(["#6495ed", "#fa8072"]);
  var edgeColor = function(d) {return ((d > 0) ? "#000" : "#c64841")}
  var edgeStroke = function(d) {return Math.sqrt(d)}
  var partisanColor = function(d) {return "#bbb"};
  var opacityScale = function(d) {
      var influence = Math.abs(d);
      if(influence > NS.threshold) return .5;
      else                         return .01;
  };

  function marker(color, opacity) {
    var name = "arrowhead-" + color.replace("#", "") + "-" + opacity * 100;
    if(NS.svg.select("defs").select("#" + name).empty()) {
      NS.svg.select("defs").append("marker")
      .attr("id", name)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 15) // This sets how far back it sits, kinda
      .attr("refY", 0)
      .attr("markerWidth", function(d) { return 6 * edgeStroke(d) })
      .attr("markerHeight", function(d) { return 6 * edgeStroke(d) })
      .attr("xoverflow","visible")
      .attr("orient", "auto")
      //.attr("markerUnits", "userSpaceOnUse")
      .append("svg:path")
      .attr("d", "M0,-5L10,0L0,5")
      .style("fill", color)
      .style("opacity", opacity);
    }
    return "url(#" + name + ")";  

  }
  //var xCenter = {Liberal: 0, Conservative: NS.width}


  // add a custom force based off of
  // https://github.com/d3/d3-force/blob/master/src/radial.js
  // read https://hi.stamen.com/forcing-functions-inside-d3-v4-forces-and-layout-transitions-f3e89ee02d12 for further reference


var simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(function(d) { return d.id; }).distance(300))
    .force("center", d3.forceCenter(NS.width / 2, NS.height / 2))
    /*.force("x", d3.forceX().x(function(d) {
      return xCenter[d.label]
    }))*/


  // Links: create link elements
  var link = NS.svg.append("g")
      .attr("class", "links")
    .selectAll("line")
    .data(NS.links)
    .enter().append("line")
      .attr("stroke-width", function(d) { return edgeStroke(d.value); })
      .attr("stroke-opacity",  function(d) {return opacityScale(d.value)})
      .each(function(d) {
        var color = edgeColor(d.value);
        var opacity = opacityScale(d.value);
        d3.select(this).style("stroke", color)
                       .attr("marker-end", marker(color, opacity));
      });
  link.append("title")
    .text(function (d) {return d.value;});
    
  // Links: create paths for edge text labels to follow
  edgepaths = NS.svg.selectAll(".edgepath")
    .data(NS.links)
    .enter()
    .append('path')
    .attrs({
        'class': 'edgepath',
        'fill-opacity': 0,
        'stroke-opacity': 0,
        'id': function (d, i) {return 'edgepath' + i}
    })
    .style("pointer-events", "none");
  // Links: create edge labels
  edgelabels = NS.svg.selectAll(".edgelabel")
    .data(NS.links)
    .enter()
    .append('text')
    .style("pointer-events", "none")
    .attrs({
        'class': 'edgelabel',
        'id': function (d, i) {return 'edgelabel' + i},
        'font-size': 10,
        'fill': '#666',
        'opacity': function(d) { return opacityScale(d.value)},
        'dy': function(d) { return -1 * edgeStroke(d.value) }
    });

  // Links: attach edge label paths to edge labels
  edgelabels.append('textPath')
    .attr('xlink:href', function (d, i) {return '#edgepath' + i})
    .style("text-anchor", "middle")
    .style("pointer-events", "none")
    .attr("startOffset", "50%")
    .text(function (d) {return d3.format(".5g")(d.value)});

  // Nodes: create nodes
  var node = NS.svg.append("g")
      .attr("class", "nodes")
    .selectAll("g")
    .data(NS.nodes)
    .enter().append("g")

  // Nodes: Create circles that represent nodes
  var circles = node.append("circle")
      .attr("r", 15)
      .attr("fill", function(d) { return partisanColor(d); }) 
      .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended));
  // Nodes: create node labels
  var lables = node.append("text")
      .text(function(d) {
        return d.label;
      })
      .attr('x', 6)
      .attr('y', 3);
  node.append("title")
      .text(function(d) { return d.label; });

  simulation.nodes(NS.nodes)
            .on("tick", ticked);

  simulation.force("link")
            .links(NS.links)
      

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
    // re-draw edge paths
    edgepaths.attr('d', function (d) {
          return 'M ' + d.source.x + ' ' + d.source.y + ' L ' + d.target.x + ' ' + d.target.y;
        });
    // rotate labels to ensure legibility
    edgelabels.attr('transform', function (d) {
        if (d.target.x < d.source.x) {
            var bbox = this.getBBox();

            rx = bbox.x + bbox.width / 2;
            ry = bbox.y + bbox.height / 2;
            //return 'rotate(180 ' + rx + ' ' + ry + ')';
            var rotate = 'rotate(180 ' + rx + ' ' + ry + ')'
            var translate = 'translate(0 0)';
        }
        else {
            var rotate = 'rotate(0)';
            var translate = 'translate(0 0)';
        }
        return rotate + translate;
    });
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
