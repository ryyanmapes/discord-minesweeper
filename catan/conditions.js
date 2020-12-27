// Conditions
// Conditions detect something within an environment.

const logger = require('winston');
const item = require('./item.js');

const cu = require('./utils.js');

let condition_list = [];

class CatanCondition {
    constructor (name, func, extra_params) {

        if (name == null) this.name = "";
        else this.name = name;

        if (func == null) this.func = trueCF;
        else this.func = func;

        if (extra_params == null) this.extra_params = {};
        else this.extra_params = extra_params;
    }

    test(context, params) {
        var real_params = cu.combineObjects(params, this.extra_params);
        return this.func(context, real_params);
    }
}

module.exports = {
    CatanCondition : CatanCondition,
    initConditions : initConditions,
    getCondition : getCondition,
    testCondition : testCondition,
    evalCondition : evalCondition
}

function trueCF (context, params) { return true; }

function hasItemWithTagCF (context, params) { 
    var tag = params.tag;

    for (var item of context.player.inventory) {
        if (item.stats[tag] == true) return true;
    }
    return false;
}

function hasToolWithPowerCF (context, params) { 
    var tag = params.tag;
    var power = params.power;

    for (var item of context.player.inventory) {
        if (item.stats[tag] == true && item.stats.tool_power >= power) return true;
    }
    return false;
}



function initConditions() {
    condition_list.push( new CatanCondition( "Has Axe", hasToolWithPowerCF, {"tag":"Axe", "power":2} ) );
    
    //logger.info(tag_list);
}

// Condition Evaling

function getCondition(name) {
    for (var cond of condition_list) {
        if (cond.name.toLowerCase() == name.toLowerCase()) return cond;
    }
    return null;
}

function testCondition(context, params, name) {
    var cond = getCondition(name);
    if (cond == null) return; // todo error
    return cond.test(context, params);
}

function evalCondition(context, obj) {
    
    if (obj.type == null) {} // todo error
    else if (obj.type == "AND") {} // todo
    else if (obj.type == "OR") {} // todo
    
    return testCondition(context, obj, obj.type);

}