

const logger = require('winston');
const fs = require('fs');
const lodash = require('lodash');

const cu = require('./utils.js');
const ci = require('./item.js');
const ct = require('./tag.js');
const ce = require('./effect.js');
const ca = require('./affector_field.js');

const recipes_directory = "./data/recipes/"


class CatanRecipe {
    constructor (name = "NULL", finders = {}, effects = {}, result = "Perfectly Generic Item") {
        this.name = name;
        this.finders = finders;
        this.effects = effects;
        this.result = result;
    }
}

function makeRecipe(obj) {
    var base = new CatanRecipe();
    var applied = Object.assign(base,obj);
    return applied;
}



function saveAllRecipes(recipe_list) {
    for (recipe of recipe_list) {
        fs.writeFileSync(recipes_directory + recipe.name + ".json", JSON.stringify(recipe, null, 2)  );
    }
}

function readAllRecipes() {
    var acc = []
    var dirs = fs.readdirSync(recipes_directory).forEach( filename => {
        var file = fs.readFileSync(recipes_directory + filename);
        var recipe = makeRecipe(JSON.parse(file));

        //logger.info(recipe);
        acc.push(recipe);
    });
    return acc;
}

function getRecipe(recipe_list, name, is_build) {
    for (var recipe of recipe_list) {
        if (is_build == false && recipe.is_build == true) continue;
        if (is_build == true && recipe.is_build != true) continue;
        if (recipe.name.toLowerCase() == name.toLowerCase()) return recipe;
    }
    return null;
}


// Returns an object {"worked":Bool, "msg":...}, where 'worked' says if the recipe was actually successfully crafted or not.
function craftRecipe(prefab_list, recipe_list, context, name, is_build) {
    var recipe = getRecipe(recipe_list, name, is_build);
    if (recipe == null) return "Recipe \'" + name + "\' not found!";

    var results = ca.evalFinders(context, recipe.finders);

    //logger.info(results);

    if (results.length == 0) return {"worked":false, "msg": "ERROR: Something is wrong with the recipe: " + name};
    if (typeof(results[0]) == "string") return {"worked":false, "msg": results};

    var tag_acc = [];
    for (var items of results) {
        for (var item of items) {
            for (var tag of item.properties) {
                tag_acc.push(tag.tag);
            }
        }
    }

    var msg = ""
    for (var i = 0; i < results.length; i++) {
        for (var found_item of results[i]) {
            msg += ca.evalAffector(context, found_item, recipe.effects[i], 1) + "\n";
        }
    }
    
    var result_item = ci.instantiatePrefab(prefab_list, recipe.result);
    for (tag_name of tag_acc) {
        var tag = ct.getTag(tag_name);
        if (tag.type == "Function") continue;
        result_item.addTag(tag);
    }

    result_item.update(context);
    msg += "You now have a " + result_item.name + "!"; 
    
    ci.addItemToInventory(context.player.inventory, result_item);

    ca.evalFindersFinals(context, recipe.finders);
    
    return {"worked":true, "msg": msg};
}




module.exports = {
    CatanRecipe : CatanRecipe,
    makeRecipe : makeRecipe,
    saveAllRecipes : saveAllRecipes,
    readAllRecipes : readAllRecipes,
    getRecipe : getRecipe,
    craftRecipe : craftRecipe,
}