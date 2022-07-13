const filesPromises = [];

let jobs;
let participants;
let months;
let costOfLiving;


// Read from csv
let Business = {
    Apartments: undefined,
    Employers: undefined,
    Schools: undefined,
    Pubs: undefined,
    Restaurants: undefined
};

let currentMonth = 0;
let date = new Date(2022, 2, 1); // First month starts at March 2022
const lastMonth = 14;

let businessDetails = [];

let animate = true;
let ready = false;
let timer;



function financeDetailsRow(d) {
    return {
        participantId: +d.participantId,
        jobId: d.jobId, //when there is no job: -1
        financialStatus: d.financialStatus,
        availableBalance: +d.availableBalance,
        extraBudget: +d.extraBudget,
        wage: +d.wage,
        avgDailyWorkTime: +d.avgDailyWorkTime
    };
};
// participantId matches index
function participantsRow(d) {
    return {
        participantId: +d.participantId,
        householdSize: +d.householdSize,
        haveKids: d.haveKids,
        age: +d.age,
        educationLevel: d.educationLevel, //"Low", "HighSchoolOrCollege", "Bachelors", "Graduate"
        joviality: +d.joviality
    };
};
// jobId matches index
function jobsRow(d) {
    return {
        jobId: +d.jobId,
        employerId: +d.employerId,
        hourlyRate: +d.hourlyRate,
        educationRequirement: d.educationRequirement
    };
};
// participantId matches index
function costOfLivingRow(d) {
    return {
        month: +d.month,
        householdSize: +d.householdSize,
        costOfLiving: +d.costOfLiving
    };
};

function businessRow(d) {
    return {
        id: +d.id,
        participantId: +d.participantId,
        amount: Math.abs(parseFloat(d.amount))
    };
};

let readFiles = function () {
    for (let i = 0; i <= 14; i++) {
        filesPromises.push(d3.csv('Datasets/Finance Details/Month' + i + '.csv', financeDetailsRow));
    }
    filesPromises.push(d3.csv('Datasets/Attributes/Participants.csv', participantsRow));
    filesPromises.push(d3.csv('Datasets/Attributes/Jobs.csv', jobsRow));
    filesPromises.push(d3.csv('Datasets/Cost Of Living.csv', costOfLivingRow));
    Object.keys(Business).forEach(function (business) {
        for (let i = 0; i <= 14; i++) {
            filesPromises.push(d3.csv(`Datasets/Transactions/${business}/Month${i}.csv`, businessRow));
        }
    });
}

let animateGraphs = function () {
    if (animate && ready) {
        // show once initially
        updateLegend();
        updateFinanceGraph(financeData[currentMonth], "#finance-svg", financeHeight);
        updateBusinessGraph(businessData[currentMonth], "#business-svg", businessHeight);
        timer = d3.interval(_ => {
            if (currentMonth == lastMonth) {
                currentMonth = 0; //reset
                date.setMonth(2);
                date.setFullYear(2022);
            } else {
                currentMonth++;
                date.setMonth(date.getMonth() + 1);
            }
            updateLegend();
            updateFinanceGraph(financeData[currentMonth], "#finance-svg", financeHeight);
            updateBusinessGraph(businessData[currentMonth], "#business-svg", businessHeight);
        }, 1000); //show after delay of 1s
    }
}

readFiles();

let financeData = [];
let businessData = [];

let setFinanceData = function () {
    for (let m = 0; m <= lastMonth; m++)
        financeData.push(getMonthlyFinancialDetails(m));
}
let setBusinessData = function () {
    for (let m = 0; m <= lastMonth; m++) {
        businessDetails.push(Object.keys(Business).reduce((a, v) => ({ ...a, [v]: {} }), {}));
        businessData.push(getMonthlyBusinessDetails(m));
    }
}
// get participant details data of the month. initially, show 1st month
let getMonthlyFinancialDetails = function (month) {
    let employerDetails = {};
    // employersParts = [{key: employer id, value: participant ids}]
    for (let r = 0; r < months[month].length; r++) {
        let jobId = months[month][r].jobId;
        if (jobId) {
            let empId = jobs[parseInt(jobId)].employerId;
            if (!(empId in employerDetails))
                employerDetails[empId] = [months[month][r].participantId];
            else employerDetails[empId].push(months[month][r].participantId);
        }
    }
    // convert to hierarchical format for circle packing
    let monthlyData = [];
    for (let empId in employerDetails)
        monthlyData.push({ 'employerId': +empId, 'children': employerDetails[empId] }); // no. and list
    return monthlyData;
}

let getMonthlyBusinessDetails = function (month) {
    let monthlyData = [];
    Object.keys(Business).forEach(function (b) {
        let ids = []; // business ids
        //vendors = {id: {amount: value}}
        let vendors = {};
        // for each business
        for (let transaction of Business[b][month]) {
            // Eg. businessDetails = [{business name: {id: {amount: value, numTransactions: value, numCustomers: [values] }}}]
            let bid = transaction.id;
            let participantId = transaction.participantId;
            if (!(bid in businessDetails[month][b])) {
                businessDetails[month][b][bid] = { 'amount': {}, 'numTransactions': {}, 'numCustomers': {} };
                businessDetails[month][b][bid]['amount'] = transaction.amount;
                businessDetails[month][b][bid]['numTransactions'] = 1;
                businessDetails[month][b][bid]['numCustomers'] = [participantId];
            } else {
                businessDetails[month][b][bid]['amount'] += transaction.amount; // transaction amount
                businessDetails[month][b][bid]['numTransactions']++;
                if (!businessDetails[month][b][bid]['numCustomers'].includes(participantId))
                    businessDetails[month][b][bid]['numCustomers'].push(participantId); // unique customers
            }
            if (!(ids.includes(bid))) ids.push(bid);
            if (!(bid in vendors))
                vendors[bid] = transaction.amount;
            else vendors[bid] += transaction.amount;
        }
        monthlyData.push({ 'business': b, 'children': Object.entries(vendors).map(d => ({ 'id': d[0], 'amount': d[1] })) });
    });
    return monthlyData;
}

let getFinanceLegendData = function () {
    // Using employer id : 1763 for legend data
    let particpantIds = Object.values(financeData[0]).filter(d => d.employerId == 1763);
    return [particpantIds[0]];
}

let pack = d3.pack().padding(function (d) {
    if (d.height == 1) {
        return 0;
    }
    return d.height * 2.5; // for height 2, packing for height 0 (largest outer circle) will be 0
});

let packBusiness = d3.pack().padding(function (d) {
    if (d.height == 1) {
        return 0;
    }
    return d.height * 10; // for height 2 (packing between clusters), packing for height 0 (largest outer circle) will be 0
});

let financeHeight = Math.min(window.innerHeight, window.innerWidth);
let width;
let businessHeight = 1.2 * financeHeight;
let financeSvg;
let nodeHeirarchyFinance;
let rootFinanace;

let nodeHeirarchyBusiness;
let rootBusiness;
let circlesG;
let businessTexts;

let squareShape = d3.symbol().type(d3.symbolSquare).size(50);
let triangleShape = d3.symbol().type(d3.symbolTriangle).size(25);
let circleShape = d3.symbol().type(d3.symbolCircle).size(50);
let duration = 0;

let numTransactionsColors = ['#FF8921', '#B17DFF', '#86E195'];
let numTransBusinessScale = Object.keys(Business).reduce((a, v) => ({ ...a, [v]: {} }), {});
let numTransGlobalScale;
let hourlyRateScale;
let salaryColor = d3.scaleLinear();
let ageColorScale;
/*
* isNumTransGlobal
* true: data is scaled among all businesses
* false: data is scaled for each individual business
*/
let isNumTransGlobal = true;

// append the svg object to the body of the page
let toolTipG;

let handleMouseover = function (e, d) {
    if (d.depth == 0) {
        console.log('here')
        return;
    }
    // get closest parent of this node that matches 'svg'
    let svgId = this.closest("svg").getAttribute('id');
    if (!(svgId == 'finance-svg' || svgId == 'business-svg')) return;

    let tooltip = d3.select(`#${svgId} .tooltip`); //g

    tooltip.style("display", "inline")
        .style("opacity", 1);

    d3.select(this).classed('black', true);

    // Update log scale of legend for current business
    if (svgId == 'business-svg') {
        if (isNumTransGlobal) updateGradientLegend('#numtrans-legend', numTransGlobalScale.domain(), true);
        else {
            let business = (d.depth == 1) ? d.data.business : d.parent.data.business;
            updateGradientLegend('#numtrans-legend', numTransBusinessScale[business].domain(), true);
        }
    }

    let tooltipText = tooltip.select('.tooltip-text').text(getToolTipMsg(d));
    wrap(tooltipText, 7);

    let tooltipTextBx = tooltip.select(".tooltip-text").node().getBoundingClientRect();
    let svg = d3.select(`#${svgId}`).node().getBoundingClientRect();
    let w = tooltipTextBx.width + 12;
    let h = tooltipTextBx.height + 12;

    let x = d.x;
    let y = (d.depth == 2) ? d.y : d.y + d.r;

    // Adjust tooltip when it goes out of right side
    if (d.x + w >= svg.width)
        x = d.x - w;
    // Adjust tooltip when it goes out of top
    if (d.y + h >= svg.height)
        y = d.y - h;

    tooltip.attr("transform",
        "translate(" + x + "," + y + ")");
    tooltip.select('.tooltip-rect')
        .attr('width', w)
        .attr('height', h);
}

let handleMouseleave = function (e, d) {
    d3.selectAll(".tooltip").style("display", "none")
        .style("opacity", 0);
    d3.select(this).classed('black', false);
}

let getToolTipMsg = function (d) {
    if (d.parent.data.employerId) {
        let text = `Participant ID: ${d.data} <br>
                Age: ${participants[d.data].age} <br>
                Education: ${participants[d.data].educationLevel} <br>
                Household Size: ${participants[d.data].householdSize} <br>
                Employer ID: ${d.parent.data.employerId} <br>
                Hourly Rate: ${numberWithCommas(Math.round(jobs[parseInt(months[currentMonth][d.data].jobId)].hourlyRate * 100) / 100)} <br>
                Monthly Wages: ${numberWithCommas(Math.round(months[currentMonth][d.data].wage * 100) / 100)} <br>
                Financial Status: ${months[currentMonth][d.data].financialStatus} <br>
                Available Balance: ${numberWithCommas(Math.round(months[currentMonth][d.data].availableBalance * 100) / 100)} <br>
                Extra Budget: ${numberWithCommas(Math.round(months[currentMonth][d.data].extraBudget * 100) / 100)}`;

        let avgDailyWorkTime = months[currentMonth][d.data].avgDailyWorkTime;
        if (avgDailyWorkTime != -1)
            text = `${text} <br> Avg Daily Worktime: ${avgDailyWorkTime}`;

        return text;

    } else {
        if (d.depth == 2) {
            let vendor = businessDetails[currentMonth][d.parent.data.business][d.data.id];
            return `Vendor ID: ${d.data.id} <br>
                    Amount: ${numberWithCommas(Math.round(d.data.amount * 100) / 100)} <br>
                    Customers: ${vendor.numCustomers.length} <br>
                    Transactions: ${numberWithCommas(vendor.numTransactions)}`;
        } else if (d.depth == 1) {
            let totalTransactions = 0;
            let totalCustomers = 0;
            Object.entries(businessDetails[currentMonth][d.data.business]).forEach(function(d) {
                totalTransactions += d[1].numTransactions;
                totalCustomers += d[1].numCustomers.length;
            })
            return `Amount: ${numberWithCommas(Math.round(d.value * 100) / 100)} <br>
            Customers: ${totalCustomers} <br>
            Transactions: ${numberWithCommas(totalTransactions)}`;
        }
    }
}


let createFinanceClusterLegend = function () {
    d3.select("#finance-cluster")
        .attr("height", 70)
        .attr("width", 70)
        .attr("viewBox", [0, 0, 50, 40]);
}

let createBusinessClusterLegend = function () {
    d3.select("#business-cluster")
        .attr("height", 93)
        .attr("width", 190)
        .attr("viewBox", [-40, -5, 30, 61])
}

let createFinanceGraph = function () {
    d3.select("#finance-svg")
        .attr("viewBox", [0, 0, getSVGwidth(), financeHeight]);
}

let createBusinessGraph = function () {
    d3.select("#business-svg")
        .attr("viewBox", [0, ((businessHeight - financeHeight) / 2) - 2, getSVGwidth(), financeHeight]);
}

$(document).ready(function () {
    width = window.innerWidth - d3.select('#side-panel').node().getBoundingClientRect().width;
    createFinanceGraph();
    createBusinessGraph();

    createFinanceClusterLegend();
    createBusinessClusterLegend();

    addToolTip();
});

let getRotatedWidth = function (r, angle) {
    return r * Math.cos(angle);
}
let getRotatedHeight = function (r, angle) {
    return r * Math.sin(angle);
}

let addToolTip = function () {
    let tt = d3.selectAll(".tooltip");
    tt.append('rect')
        .attr("class", "tooltip-rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("rx", 6)
        .attr("ry", 6)
        .attr("width", 170)
        .attr("height", 160);

    tt.append("text")
        .attr("class", "tooltip-text")
        .attr("x", 20)
        .attr("y", 17)
        .attr("dy", 0)
        .text();
}

/*
* shapes determine household size
* circle: household size 1
* square: household size 2
* triangle: household size 3
**/
let showHouseholdSize = function (data, svg, className, shape, month) {
    let s = d3.selectAll(`${svg} .household-shapes`)
        .selectAll(`.${className}`)
        .data(data, d => d.data)

    s.exit()
        .transition().duration(duration / 2)
        .remove();

    s.transition().duration(duration)
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .attr("fill", function (d) {
            let jobId = parseInt(months[month][d.data].jobId);
            if (jobId && !isNaN(jobId))
                return hourlyRateScale(jobs[jobId].hourlyRate);
        })

    s.enter().append("path")
        .attr("class", className)
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .attr("fill", function (d) {
            let jobId = parseInt(months[month][d.data].jobId);
            if (jobId && !isNaN(jobId))
                return hourlyRateScale(jobs[jobId].hourlyRate);
        })
        .attr("d", shape)
        .attr("stroke", function (d) {
            return ageColorScale(participants[d.data].age);
        })
        .attr("stroke-dasharray", function (d) {
            if (months[month][d.data].financialStatus != "Stable")
                return "1,0.5";
        })
        .style("stroke-width", "1.5px")

        .on("mouseover", handleMouseover)
        .on("click", handleMouseover)
        .on("mouseleave", handleMouseleave);
}

let showBelowCOLCircles = function (data, svg, className, angle) {
    let c = d3.selectAll(`${svg} .below-COL-circles`)
        .selectAll(`.${className}`)
        .data(data, d => d.data);

    c.exit()
        .transition().duration(duration / 2)
        .attr("r", 0)
        .remove();

    // update circles
    c.transition().duration(duration)
        //.attr("cx", d => d.x - getRotatedWidth(d.r, Math.PI / 2))
        .attr("cx", d => d.x - getRotatedWidth(0.9 * d.r, angle))
        .attr("cy", d => d.y - getRotatedHeight(0.9 * d.r, angle))
        .attr("r", function (d) {
            return d.r / 3;
        });


    // add new circles
    c.enter().append("circle")
        //.style("fill", d => color(d.parent.data.employerId))
        //.style("fill", fill)
        //.attr("stroke", d => color(d.parent.data.employerId))
        .attr("class", className)
        .attr("cx", d => d.x - getRotatedWidth(0.9 * d.r, angle))
        .attr("cy", d => d.y - getRotatedHeight(0.9 * d.r, angle))
        .attr("r", 0)
        .transition().duration(duration)
        .attr("r", function (d) {
            return d.r / 3;
        });
}

let showEducationLines = function (data, svg, className, top) {
    let l = d3.selectAll(`${svg} .education-lines`)
        .selectAll(`.${className}`)
        .data(data, d => d.data);

    // remove previous lines
    l.exit()
        .transition().duration(duration / 2)
        .remove();

    let dy = top == true ? 2 : top == false ? -2 : 0;

    // update existing lines
    l.transition().duration(duration)
        .attr('x1', d => d.x - 4)
        .attr('y1', d => d.y - dy)
        .attr('x2', d => d.x + 4)
        .attr('y2', d => d.y - dy)
        // Financial stabilities that are Unknown or Unstable are marked with dotted lines 
        .attr("stroke-dasharray", function (d) {
            if (months[currentMonth][d.data].financialStatus == "Unstable")
                return "1,1.5";
        });

    // add new lines
    l.enter().append('line')
        .attr("class", className)
        .attr('x1', d => d.x - 4)
        .attr('y1', d => d.y - dy)
        .attr('x2', d => d.x + 4)
        .attr('y2', d => d.y - dy)
        // Financial stabilities that are Unknown or Unstable are marked with dotted lines 
        .attr("stroke-dasharray", function (d) {
            if (months[currentMonth][d.data].financialStatus == "Unstable")
                return "1,1.5";
        });
}

let updateBusinessGraph = function (data, svg, height, width = getSVGwidth()) {
    nodeHeirarchyBusiness = d3.hierarchy({ children: data })
        .sum(d => d.amount)
        .sort((a, b) => b.value - a.value) //higher value at center

    packBusiness.size([width, height]);
    rootBusiness = packBusiness(nodeHeirarchyBusiness);

    let leaves = rootBusiness.leaves();
    let descendants = rootBusiness.descendants();

    let businessTitles = [];
    let numTransGlobalRange = [Infinity, -Infinity];
    let numTransBusinessRange = Object.keys(Business).reduce((a, v) => ({ ...a, [v]: [Infinity, -Infinity] }), {});
    let outerCircles = [];
    descendants.forEach(function (d) {
        if (d.depth == 1) {
            businessTitles.push(d);
            outerCircles.push(d);
        }
        if (d.depth == 2) {
            let business = d.parent.data.business;
            let n = businessDetails[currentMonth][business][d.data.id].numTransactions;

            // find global min, max transactions of all businesses
            if (n < numTransGlobalRange[0]) numTransGlobalRange[0] = n;
            if (n > numTransGlobalRange[1]) numTransGlobalRange[1] = n;

            // find individual business min, max transactions
            if (n < numTransBusinessRange[business][0]) numTransBusinessRange[business][0] = n;
            if (n > numTransBusinessRange[business][1]) numTransBusinessRange[business][1] = n;
        }
    });


    let logScale = d3.scaleLog();

    // Business scale
    // find log scale for each business
    Object.keys(numTransBusinessRange).forEach(function (d) {
        logScale.domain(numTransBusinessRange[d])
            .range([0, 100]);
        numTransBusinessScale[d] = d3.scaleLog()
            .domain(getDomainValues(logScale, 3))
            .range(numTransactionsColors);

    });

    // Global scale
    logScale.domain(numTransGlobalRange).range([0, 100]);
    // easier to determine as a percent
    numTransGlobalScale = d3.scaleLog()
        .domain(getDomainValues(logScale, 3))
        .range(numTransactionsColors);
    // Update log scale of legend for current month
    updateGradientLegend('#numtrans-legend', numTransGlobalScale.domain(), true);


    // outer circles marking business revenue/expense
    let businessCircles = d3.selectAll(`${svg} .business-circles`)
        .selectAll('.business-circle')
        .data(outerCircles, d => d.data.business);

    businessCircles.exit()
        .transition().duration(duration / 2)
        .attr("r", 0)
        .remove();

    businessCircles
        .transition().duration(duration / 2)
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", d => d.r)
        .style("fill", 'transparent');

    businessCircles.enter()
        .append("circle")
        .attr("class", "business-circle")
        .on("mouseover", handleMouseover)
        .on("click", handleMouseover)
        .on("mouseleave", handleMouseleave)
        .style("fill", 'transparent')
        .attr("stroke", function (d) {
            return (d.data.business == "Employers") ? "#FFDBDB" : "#D8E6CC";
        })

        .style("stroke-width", "2.5px")
        //vendorCircles
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", 0)
        .transition().duration(duration)
        .attr("r", d => d.r);

    let vendorCircles = d3.selectAll(`${svg} .business-circles`)
        .selectAll('.vendor-circle')
        .data(leaves, d => d.data.id)

    vendorCircles.exit()
        .transition().duration(duration / 2)
        .attr("r", 0)
        .remove();

    vendorCircles
        .transition().duration(duration / 2)
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", d => 0.7 * d.r)
        .style("fill", function (d) {
            let business = d.parent.data.business;
            let numTransactions = businessDetails[currentMonth][business][d.data.id].numTransactions;
            return isNumTransGlobal ? numTransGlobalScale(numTransactions) : numTransBusinessScale[business](numTransactions);
        });

    vendorCircles.enter()
        .append("circle")
        .attr("class", "vendor-circle")
        .on("mouseover", handleMouseover)
        .on("click", handleMouseover)
        .on("mouseleave", handleMouseleave)
        .style("fill", function (d) {
            let business = d.parent.data.business;
            let numTransactions = businessDetails[currentMonth][business][d.data.id].numTransactions;
            return isNumTransGlobal ? numTransGlobalScale(numTransactions) : numTransBusinessScale[business](numTransactions);
        })
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", 0)
        .transition().duration(duration)
        .attr("r", d => 0.7 * d.r);

    const label = d3.selectAll(`${svg} .business-texts`)
        .selectAll(".business-text")
        .data(businessTitles, d => d.data)

    label.exit()
        .transition().duration(duration / 2)
        .remove();

    label
        .enter().append("text")
        .attr("class", "business-text")
        .attr("transform", function (d) {
            return `translate(${d.x},${d.y - (d.r + 8)})`;
        })
        .style("fill-opacity", 1)
        .style("display", "inline")
        .text(d => d.data.business)
        .style("font", "11px sans-serif")
        .attr("pointer-events", "none")
        .attr("text-anchor", "middle")
        .attr("font-size", "0.85em")
        .style("fill", '#696969');
}

let updateNumTransactions = function () {
    d3.selectAll(`#business-svg .business-circles .vendor-circle`)
        .style("fill", function (d) {
            let business = d.parent.data.business;
            let numTransactions = businessDetails[currentMonth][business][d.data.id].numTransactions;
            return isNumTransGlobal ? numTransGlobalScale(numTransactions) : numTransBusinessScale[business](numTransactions);
        });
}

let updateFinanceGraph = function (data, svg, height, width = getSVGwidth(), month = currentMonth) {
    nodeHeirarchyFinance = d3.hierarchy({
        children: data
    })
        .copy()
        .count()
        .sort((a, b) => b.value - a.value); //higher count at center

    pack.size([width, height]);
    rootFinanace = pack(nodeHeirarchyFinance);

    let leaves = rootFinanace.leaves(); //1011 leaves, represnting each participant

    let onePersonHousehold = [] // participants
    let twoPeopleHousehold = [] // participants
    let threePeopleHousehold = [] // participants
    leaves.forEach(function (d) {
        if (d.depth == 2) {
            if (participants[d.data].householdSize == 1)
                onePersonHousehold.push(d);
            else if (participants[d.data].householdSize == 2)
                twoPeopleHousehold.push(d);
            else if (participants[d.data].householdSize == 3)
                threePeopleHousehold.push(d);
        }
    });

    let belowCOL = [];
    leaves.forEach(function (d) {
        if (d.depth == 2) {
            let householdSize = participants[d.data].householdSize;
            let avgCOL = getMonthlyCostOfLiving(householdSize, month);
            if (months[month][d.data].wage < Math.abs(avgCOL))
                belowCOL.push(d);
        }
    });
    showBelowCOLCircles(belowCOL, svg, "belowCOL", Math.PI / 2);

    // Show household size as shapes
    showHouseholdSize(onePersonHousehold, svg, "one-household-circles", circleShape, month);
    showHouseholdSize(twoPeopleHousehold, svg, "two-household-squares", squareShape, month);
    showHouseholdSize(threePeopleHousehold, svg, "three-household-triangles", triangleShape, month);

    /*  Education levels (info for all participants is present)
    *   Low: no line
    *   High school or college: 1 line
    *   Bachelors: 2 lines
    *   Graduate: 3 lines
    */

    let highSchoolData = [];
    let bachelorsData = [];
    let graduateData = [];
    leaves.forEach(function (d) {
        if (d.depth == 2) {
            if (participants[d.data].educationLevel == 'HighSchoolOrCollege')
                highSchoolData.push(d);
            else if (participants[d.data].educationLevel == 'Bachelors') {
                highSchoolData.push(d);
                bachelorsData.push(d);
            } else if (participants[d.data].educationLevel == 'Graduate') {
                highSchoolData.push(d);
                bachelorsData.push(d);
                graduateData.push(d);
            }
        }
    })

    showEducationLines(highSchoolData, svg, "highschool-line");
    showEducationLines(bachelorsData, svg, "bachelors-line", false);
    showEducationLines(graduateData, svg, "graduate-line", true);
}



let getDomainValues = function (logScale, numColors) {
    //let numColors = colors.length;
    //let diff = range[1] - range[0]
    let rangeLen = 100; // range: [0,100]

    let step = rangeLen / (numColors - 1);
    //let forInversion = d3.range(numColors).map(function (d) { return range[0] + d * step });
    let forInversion = d3.range(numColors).map(function (d) { return d * step });
    let domainValues = forInversion.map(logScale.invert);

    return domainValues;
    //let logColour_scale = d3.scaleLog().domain(domainValues).range(colors);
}

let getSVGwidth = function () {
    if (window.innerWidth > 760)
        return window.innerWidth - d3.select('#side-panel').node().getBoundingClientRect().width;
    else return window.innerWidth;
}

let numberWithCommas = function (x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

let showPreviousMonth = function () {
    if (!animate) {
        if (currentMonth == 0) {
            currentMonth = lastMonth;
            date.setMonth(4);
            date.setFullYear(2023);
        } else {
            currentMonth--;
            date.setMonth(date.getMonth() - 1);
        }
        updateLegend();
        updateFinanceGraph(financeData[currentMonth], "#finance-svg", financeHeight);
        updateBusinessGraph(businessData[currentMonth], "#business-svg", businessHeight);
    }
}

let showNextMonth = function () {
    if (!animate) {
        if (currentMonth == lastMonth) {
            currentMonth = 0;
            date.setMonth(2);
            date.setFullYear(2022);
        }
        else {
            currentMonth++;
            date.setMonth(date.getMonth() + 1);
        }
        updateLegend();
        updateFinanceGraph(financeData[currentMonth], "#finance-svg", financeHeight);
        updateBusinessGraph(businessData[currentMonth], "#business-svg", businessHeight);
    }
}

let pausePlayAnimation = function (e) {
    // change icon
    let elm = e.target.closest('button').querySelector('.bi');
    if (elm) {
        if (elm.classList.contains('bi-pause-circle')) {
            elm.classList.remove('bi-pause-circle');
            elm.classList.add('bi-play-circle');
        } else {
            elm.classList.remove('bi-play-circle');
            elm.classList.add('bi-pause-circle');
        }
        // pause/continue animation
        animate = !animate;
        if (!animate) timer.stop();
        else animateGraphs();
    }
}

let updateLegend = function () {
    let dateFormat = { month: 'short', year: 'numeric' };
    //console.log(date);
    //document.getElementById('currentMonth').innerText = `Current Month: ${currentMonth}`;
    let dt = date.toLocaleDateString("en-US", dateFormat)
    document.getElementById('currentMonth').innerText = `Current Month: ${dt}`;
    // show monthly cost of living numbers
    for (let i = 1; i <= 3; i++) { // max household size is 3
        let avgCOL = numberWithCommas(Math.round(Math.abs(getMonthlyCostOfLiving(i, currentMonth)) * 100) / 100);
        document.getElementById(`household-sz-${i}`).innerText = `Household Size ${i}: ${avgCOL}`;
    }
}

let showIndividualBusinessTrans = function () {
    let checkBox = document.getElementById("transIndividual");
    if (checkBox.checked) {
        isNumTransGlobal = false;
    } else {
        isNumTransGlobal = true;
    }
    updateNumTransactions();
}


let getMonthlyCostOfLiving = function (householdSize, month) {
    return costOfLiving[3 * (month + 1) - (4 - householdSize)]['costOfLiving'];
}

Promise.all(filesPromises).then(function (d) {
    //d[0] to d[14] is activity data: index matches participant id
    months = d.slice(0, 15);
    //d[15] is participants info: index matches participant id
    participants = d[15];
    //d[16] is jobs info
    jobs = d[16];
    //d[17] is cost of living info
    costOfLiving = d[17];

    // Business transactions for 14 months in order
    Business.Apartments = d.slice(18, 33);
    Business.Employers = d.slice(33, 48);
    Business.Schools = d.slice(48, 63);
    Business.Pubs = d.slice(63, 78);
    Business.Restaurants = d.slice(78, 93);

    // Set scales
    let [min, max] = d3.extent(Object.values(jobs).map(d => d.hourlyRate));
    salaryColor.domain([min, (min + max) / 2, max]).range(["#FA8072", "gold", "yellowgreen"]);

    ageColorScale = d3.scaleLinear()
        .domain(d3.extent(participants, d => d.age))
        .range(['rgb(176,206,231)', 'rgb(20,78,153)']);

    hourlyRateScale = d3.scaleSequential(d3.interpolateGreens)
        .domain(d3.extent(jobs, d => d.hourlyRate));

    // Extract graph data
    setFinanceData();
    setBusinessData();

    // Set legend
    updateLegend();
    updateFinanceGraph(getFinanceLegendData(), '#finance-cluster', 50, 50, 0);
    let schoolData = businessData[0].filter(d => d.business == 'Schools');
    updateBusinessGraph(schoolData, "#business-cluster", 50, 50);

    // Update the graph every second for each month
    // (Also, updates the numTransactionsScale on each call as per the monthly transactions)
    ready = true;
    animateGraphs();

    /* Initially, num transactions is set to global scale
    * When user checks the box to see transactions for individual business,
    * num transactions scale will update when hovered on the business circle
    * */
    let attr = {
        shapes: [circleShape, squareShape, triangleShape],
        ageRange: ageColorScale.domain(),
        ageScaleColors: ageColorScale.range(),
        hourlyRateRange: hourlyRateScale.domain(),
        hourlyRateColors: hourlyRateScale.range(),
        numTransGlobalRange: numTransGlobalScale.domain(),
        numTransGlobalColors: numTransGlobalScale.range()
    };
    createLegend(attr);
});
