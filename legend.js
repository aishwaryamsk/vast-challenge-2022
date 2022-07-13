const educationLabels = ['Graduate', 'Bachelors', 'HighSchoolOrCollege', 'Low'];
const finStabilityLabels = ['Stable', 'Unstable/ <br> Unknown'];
const transactionTypes = ['Business Revenue', 'Business Expense'];

let createLegend = function (d) {
    // Finance legend
    addFinanceClusterTitle('#finance-cluster', 'Employer', '0.5em');
    showEducationLegend();
    showHouseholdSizeLegend(d.shapes);
    showParticipantLegend();
    showFinStabilityLegend();
    showAgeGradientLegend(d.ageRange, d.ageScaleColors);
    showHourlyRateGradientLegend(d.hourlyRateRange, d.hourlyRateColors);
    showTransGradientLegend(d.numTransGlobalRange, d.numTransGlobalColors);
    // Business legend
    showBusinessClusterLegend();
    showTransactionTypeLegend();

}
let showAgeGradientLegend = function (ageRange, ageScaleColors) {
    addGradientLegend('#age-legend', 'Age', ageRange, ageScaleColors);
}

let showHourlyRateGradientLegend = function (hourlyRateRange, hourlyRateColors) {
    addGradientLegend('#hourlyrate-legend', 'Hourly Rate', hourlyRateRange, hourlyRateColors);
}

let showTransGradientLegend = function (numTransGlobalRange, numTransGlobalColors) {
    addGradientLegend('#numtrans-legend', 'No. Transactions', numTransGlobalRange, numTransGlobalColors, true);
}

let addFinanceClusterTitle = function (id, title, sz) {
    d3.select(id).append('g').attr('class', 'labels');
    addClusterTitle(id, title, sz);
}
let showTransactionTypeLegend = function () {
    let id = '#transaction-type-legend';
    d3.select(id)
        .attr("height", 60)
        .attr("width", 110)
        .attr("viewBox", [0, 0, 110, 55]);
    d3.select(id).append('g').attr('class', 'squares');
    d3.select(id).append('g').attr('class', 'labels');
    // Title
    let l = {
        svgId: id,
        x: 8,
        y: 11,
        label: 'Transaction Type',
        sz: '0.75em'
    };
    addLabel(l);
    // Add squares and labels
    let colors = ['#D8E6CC', '#FFDBDB'];
    let s = {
        svgId: id,
        className: 'transaction-type-square',
        data: transactionTypes,
        labelSz: '0.65em',
        x0Label: 0,
        x0Square: 95,
        colors: colors
    };
    addSquares(s);

}

let addSquares = function (v) {
    let size = 11
    d3.select(`${v.svgId} .squares`)
        .selectAll(`.${v.className}`)
        .data(v.data)
        .enter()
        .append("rect")
        .attr("x", v.x0Square)
        // First square appears at 20, 5 is the distance between squares
        .attr("y", function (d, i) { return 20 + i * (size + 5) })
        .attr("width", size)
        .attr("height", size)
        .style("fill", (d, i) => v.colors[i]);

    d3.select(`${v.svgId} .labels`)
        .selectAll(`.${v.className}`)
        .data(v.data)
        .enter()
        .append("text")
        .attr("x", v.x0Label)
        // First square appears at 20, 5 is the distance between squares
        .attr("y", function (d, i) { return 20 + i * (size + 5) + (size / 2) })
        .style("fill", function (d) { return 'black' })
        .text(function (d) { return d })
        .attr("text-anchor", "left")
        .style("alignment-baseline", "middle")
        .style("font", "5px sans-serif")
        .style("font-size", v.labelSz);
}


let showFinStabilityLegend = function () {
    let id = '#fin-stability-legend';
    let svg = d3.select(id)
        .attr("height", 100)
        .attr("width", 100)
        .attr("viewBox", [4, 0, 51, 50]);
    svg.append('g').attr('class', 'circle')
    svg.append('g').attr('class', 'labels')
    svg.append('g').attr('class', 'lines');

    let y = 32;
    // Title
    addLabel({ svgId: id, x: 5, y: 6, label: 'Financial Stability', sz: '0.4em' });

    let circleX = [13, 43];
    let labelX = [6, 33];
    let r = 6;
    for (let i = 1; i <= 2; i++) {
        drawLine({ svgId: id, x1: circleX[i - 1], x2: (circleX[0] + circleX[1]) / 2, y1: y, y2: y + 10, fill: 'black', w: '0.02em' });
        addLabel({ svgId: id, x: labelX[i - 1], y: y - 16, label: finStabilityLabels[i - 1], sz: '0.32em' });
        if (i == 1) {
            drawCircle({ svgId: id, x: circleX[i - 1], y1: y, r1: r });
            drawLine({ svgId: id, x1: circleX[i - 1] - r - 1, x2: circleX[i - 1] + r + 1, y1: y, y2: y, fill: 'red', w: '0.08em' });
        }
        else {
            drawCircle({ svgId: id, x: circleX[i - 1], y1: y, r1: r, dash: '1,0.5' });
            drawLine({ svgId: id, x1: circleX[i - 1] - r - 1, x2: circleX[i - 1] + r + 1, y1: y, y2: y, fill: 'red', w: '0.08em', dash: '1.75,1.5' });
        }
    }
    addLabel({ svgId: id, x: 4, y: y + 16, label: 'Education Status lines', sz: '0.32em' });
}

let showBusinessClusterLegend = function () {
    let id = '#business-cluster';
    let svg = d3.select(id);
    svg.append('g').attr('class', 'labels')
    svg.append('g').attr('class', 'lines');

    addClusterTitle(id, 'Business', '0.5em', -45, 3);

    let x1 = [96, 95, 56, 62];
    let adjY = [11, 23, 30, 33];
    let x2 = [26, 19, 12, 26];
    let ids = ['business-revenue-lgd', 'vendor-revenue-lgd', 'flow-lgd', 'num-transactions-lgd'];
    let labels = ['Business Revenue (circle size)', "Vendor's Revenue (circle size)", 'Transaction Type', 'No. of Transactions'];

    for (let i = 1; i <= 4; i++) {
        let x = -90;
        let y = 3 + ((i) * 13);
        addLabel({ svgId: id, id: ids[i - 1], x: x, y: y, label: labels[i - 1], sz: '0.43em' });
        drawLine({ svgId: id, x1: x + x1[i - 1], x2: x2[i - 1], y1: y - 1, y2: adjY[i - 1], fill: 'black', w: '0.02em' });
    }
}

let addClusterTitle = function (id, label, sz, x = 9, y = 6) {
    addLabel({ svgId: id, x: x, y: y, label: label, sz: sz });
}

let showParticipantLegend = function () {
    let id = '#participant-legend';
    let svg = d3.select(id)
        .attr("height", 80)
        .attr("width", 130)
        .attr("viewBox", [0, 0, 55, 40])
    svg.append('g').attr('class', 'circle')
    svg.append('g').attr('class', 'labels')
    svg.append('g').attr('class', 'lines');

    // Add labels
    let adjX = [48, 29, 11];
    let adjY = [17, 25, 31];
    drawCircle({ svgId: '#participant-legend', x: 50, y1: adjY[1], y2: adjY[0], r1: 6, r2: 3 });
    let ids = ['below-COL-lgd', 'hourly-rate-lgd', 'age-lgd'];
    let labels = ['Below Cost of Living', 'Hourly Rate', 'Age'];
    addLabel({ svgId: id, x: 10, y: 6, label: 'Participant', sz: '0.38em' });
    for (let i = 1; i <= 3; i++) {
        let x = -4;
        let y = ((i + 1) * 11) - 7;
        addLabel({ svgId: id, id: ids[i - 1], x: x, y: y, label: labels[i - 1], sz: '0.32em' });
        drawLine({ svgId: id, x1: x + adjX[i - 1], x2: 50, y1: y - 1, y2: adjY[i - 1], fill: 'black', w: '0.02em' });
    }
}

let drawCircle = function (v) {
    let c = d3.select(`${v.svgId} .circle`)
        .append('circle')
        .attr("cx", v.x)
        .attr("cy", v.y1)
        .attr("r", v.r1)
        .attr("stroke", "rgb(95,135,179)")
        .attr("stroke-width", "0.15em")
        .attr("fill", 'rgb(178,225,170)');

    if (v.dash)
        c.attr("stroke-dasharray", v.dash);

    if (v.y2)
        d3.select(`${v.svgId} .circle`)
            .append('circle')
            .attr('class', 'belowCOL')
            .attr("cx", v.x)
            .attr("cy", v.y2)
            .attr("r", v.r2);
}

let showHouseholdSizeLegend = function (shapes) {
    let id = '#householdsize-legend';
    let svg = d3.select(id)
        .attr("height", 80)
        .attr("width", 120)
        .attr("viewBox", [0, 0, 50, 39])
    svg.append('g').attr('class', 'shapes')
    svg.append('g').attr('class', 'labels');

    addLabel({ svgId: id, x: 3, y: 6, label: 'Household Size', sz: '0.38em' });
    for (let i = 1; i <= 3; i++) {
        showHouseholdSizeShapes({ x: 50, y: ((i + 1) * 11) - 8, shape: shapes[i - 1] });
        addLabel({ svgId: id, x: -5, y: ((i + 1) * 11) - 7, label: `Household Size ${i}`, sz: '0.32em' });
    }
}

let showHouseholdSizeShapes = function (v) {
    d3.select('#householdsize-legend .shapes')
        .append('path')
        .attr("transform", `translate(${v.x},${v.y})`)
        .attr("fill", 'darkgrey')
        .attr("d", v.shape);
}

let showEducationLegend = function () {
    let id = '#education-legend';
    let svg = d3.select(id)
        .attr("height", 100)
        .attr("width", 120)
        .attr("viewBox", [0, 0, 50, 50])
    svg.append('g').attr('class', 'lines')
    svg.append('g').attr('class', 'labels');

    addLabel({ svgId: id, x: 3, y: 6, label: 'Education Status', sz: '0.38em' });
    for (let i = 3; i >= 0; i--) {
        let dy = -2;
        for (let j = 1; j <= i; j++) {
            let y = ((5 - i) * 10) - 6;
            drawLine({ svgId: id, x: 50, x1: 46, x2: 54, y1: y - dy, y2: y - dy, fill: 'red', w: '0.06em' });
            dy += 2;
        }
        addLabel({ svgId: id, x: -5, y: ((5 - i) * 11) - 7, label: educationLabels[(3 - i)], sz: '0.32em' });
    }
}

let drawLine = function (v) {
    let l = d3.select(`${v.svgId} .lines`)
        .append('line')
        .attr('x1', v.x1)
        .attr('y1', v.y1)
        .attr('x2', v.x2)
        .attr('y2', v.y2)
        .style('stroke', v.fill)
        .style('stroke-width', v.w);
    if (v.dash)
        l.attr("stroke-dasharray", v.dash);
}

let addLabel = function (v) {

    let t = d3.select(`${v.svgId} .labels`)
        .append('text')
        .attr("transform", `translate(${v.x},${v.y})`)
        .attr("dy", 0)
        .text(v.label)
        .style("font", "5px sans-serif")
        .style("font-size", v.sz);
    if (v.id) t.attr('id', v.id);
    wrap(t, 0);
}

function wrap(text, leftStartPosition) {
    let words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.3, // ems
        longestLine = 0,
        x = leftStartPosition,
        y = text.attr("y"),
        dy = parseFloat(text.attr("dy")),
        tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
    while (word = words.pop()) {
        if (word != '<br>') {
            line.push(word);
            if (tspan.node().getComputedTextLength() > longestLine) longestLine = tspan.node().getComputedTextLength();
            tspan.text(line.join(" "));
        }
        else {
            line = [];
            tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text('');
        }
    }
}

function addGradientLegend(svgId, title, domain, range, logScale = false) {
    let legendheight = 60, legendwidth = 190; // height & width of legend svg

    // height & width of legend rectangle
    let legendRectangleHeight = 12, legendRectangleX = 5, legendRectangleWidth = 165,
        marginLegend = { top: 20, left: 5 };

    let legendScale = logScale ? d3.scaleLog() : d3.scaleLinear();
    legendScale
        .domain([domain[0], domain[domain.length - 1]]) // set the min and max of the domain
        .range([1, legendRectangleWidth])
        .nice();

    // Define Axis for legend
    let legendAxis = ((domain[domain.length - 1]) > 10) ? d3.axisBottom(legendScale).ticks(3, "~s"): d3.axisBottom(legendScale).ticks(2);

    let svg = d3.select(`${svgId}`)
        .attr("width", legendwidth)
        .attr("height", legendheight);

    // Linear gradient for legend rectangle
    let legendGradient = svg
        .append("defs")
        .append("linearGradient")
        .attr("id", `${svgId}-gradient`);

    let step = 100 / (range.length - 1);
    for (let i = 0; i < range.length; i++) {
        legendGradient.append("stop")
            .attr("offset", `${i * step}%`)
            .attr("stop-color", range[i]);
    }

    // Append legend rectangle to SVG
    svg.append('rect')
        .attr('class', 'gradient-rect')
        .attr('x', legendRectangleX)
        .attr('y', marginLegend.top)
        .attr('width', legendRectangleWidth)
        .attr('height', legendRectangleHeight)
        .style("fill", `url(#${svgId}-gradient)`);

    svg.append("text")
        .text(title)
        .attr('x', marginLegend.left)
        .attr('y', marginLegend.top - 5)
        .attr("text-anchor", "center")
        .attr("font-size", "0.7em");

    svg.append("g")
        .attr("class", "legend-axis")
        .attr("transform", "translate(" + (legendRectangleX) + "," + (marginLegend.top + legendRectangleHeight) + ")")
        .call(legendAxis);
};

let updateGradientLegend = function (svgId, domain, logScale = false) {
    let legendRectangleWidth = 165;
    let legendScale = logScale ? d3.scaleLog() : d3.scaleLinear();
    legendScale
        .domain([domain[0], domain[domain.length - 1]]) // set the min and max of the domain
        .range([1, legendRectangleWidth])
        .nice();

    let legendAxis = ((domain[domain.length - 1]) > 10) ? d3.axisBottom(legendScale).ticks(3, "~s"): d3.axisBottom(legendScale).ticks(2);
    d3.select(`${svgId} .legend-axis`)
        .call(legendAxis);
}