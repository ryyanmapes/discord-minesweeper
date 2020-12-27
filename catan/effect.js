// Status effects that can be applied to items, players, objects, entities, and more.


let status_list = [];

class CatanStatusEffect {
    constructor (name = "NULL", description = "TODO", update_func = nullUF, combine_func = overwriteCF, print_function) {
        this.name = name;
        this.description = description;
        this.update_func = update_func;
        this.combine_func = combine_func;
        this.print_function = print_function;
    }

    // Printing

    getInspectLine() {
        return "__" + this.name + "__\n" + this.description; 
    }

    getOverviewLine(affectee, params) {
        if (this.print_function == null) return "__" + this.name + "__"; 
        else return this.print_function(affectee, params);
    }

    // Updating   
    // These WILL modify context!
    update (context, params) {
        this.update_func(context, params);
    }

    // Combining (for when we stack conditions)
    // params1 takes precedence!
    combine(params1, params2) {
        return this.combine_func(params1, params2);
    }
}

// Update Functions

function nullUF (context, params) {
    return;
}

// Amount Functions

function overwriteCF (params1, params2) {
    return params2;
}

function amountCF (params1, params2) {
    return {"amount":params1.amount + params2.amount};
}

// Print Functions

function hiddenPF (affectee, params) {
    return "";
}

function durabilityPF (affectee, params) {
    var durability = affectee.stats['durability']
    return "" + (durability - params.amount) + "/" + durability;
}



function initStatuses() {
    status_list.push( new CatanStatusEffect( "Durability Damage", "TODO", nullUF, amountCF, durabilityPF ) );
    
    //logger.info(tag_list);
}

// Condition Evaling

function getStatus(status_obj) {
    return getStatusByName(status_obj.type);
}

function getStatusByName(name) {
    for (var status of status_list) {
        if (status.name.toLowerCase() == name.toLowerCase()) return status;
    }
    return null;
}

function findStatusIn(statuses, name) {
    for (var status of statuses) {
        if (status.type == name) return status;
    }
    return null;
}

function addStatusTo(statuses, type, params) {
    for (var status of statuses) {
        if (status.type == type) {
            status.params = getStatusByName(type).combine(status.params, params);
            return;
        }
    }
    stat_list.push({"type":type, "params":params});
}

module.exports = {
    CatanStatusEffect : CatanStatusEffect,
    getStatus : getStatus,
    getStatusByName : getStatusByName,
    findStatusIn : findStatusIn,
    addStatusTo : addStatusTo,
    initStatuses : initStatuses
}