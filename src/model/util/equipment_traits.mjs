/**
 * Used for determining if a given trait should be allowed to be applied to a given item.
 * @callback ItemSystemCallback
 * @param {BaseEquipment} item - The base system data of the item.
 * @returns {boolean} - True if the trait may be applied to the item.
 */

/**
 * Contains anything related to resolving a check.
 * @typedef {Object} PreResolveDetails
 * @param {string} proficiency - The proficiency to resolve the check.
 * @param {string[]} domains - The domains collected up before the check is resolved.
 * @param {string[]} discriminators - The discriminators collected up before the check is resolved.
 */

/**
 * Used for determining if a given trait should be allowed to be applied to a given item.
 * @callback PreResolvingCallback
 * @param {BaseEquipment} item - The base system data of the item.
 * @param {PreResolveDetails} details - See that object's documentation.
 */

/**
 * 
 * @typedef {Object} WeaponTraitType
 * @property {string} label - The "name" for the trait as shown to the user.
 * @property {string} desc - The description of the trait, as shown to the user.
 * @property {?ItemSystemCallback} validity_cb - A function that determines whether a trait is valid for the item. 
 *                                               Can be null, in which case, the trait is always valid.
 * @property {?PreResolvingCallback} preresolve_cb
 * @property {DynamicEffect[]} dynamic_effects - An array of dynamic effects that are going to be applied to all characters, 
 *                                               even if they don't have an item with this trait.
 *                                               Can be used to set up DEs that affect every item with a specific trait ahead of time.
 * @property {}
 */

/**
 * @type Object.<string, WeaponTraitType>
 */
export const WEAPON_TRAITS = {
    activated: {
        label: "warden.traits.weapon.activated.label",
        desc: "warden.traits.weapon.activated.desc",
        dynamic_effects: []
    },
    advanced: {
        label: "warden.traits.weapon.advanced.label",
        desc: "warden.traits.weapon.advanced.desc",
        dynamic_effects: [],
        preresolve_cb: (item, details) => {
            const actor = item.parent.actor;

            if (actor)
                if (actor.system.path.combat.rank < 3)
                    details.proficiency = "untrained";
        }
    },
    agile: {
        label: "warden.traits.weapon.agile.label",
        desc: "warden.traits.weapon.agile.desc",
        validity_cb: (item) => {
            return ["heavy", "huge"].find((x) => x === item.weight) === undefined;
        },
        dynamic_effects: [
            {
                type: "bonus",
                label: "Agile",
                domains: new Set(["attack", "strike.attack"]),
                defaultEnabled: true,
                applicable_if: ["attack.trait.agile", "map"],

                modifier_type: "universal",

                mode: "add",
                value: 2,
            }
        ]
    }
}