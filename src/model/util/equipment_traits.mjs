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
 * Looks through a set of traits, and finds traits that indicate that they're part of the family of traits a given trait is,
 * but *isn't* the given trait themselves. As an example, if you have a given trait of `magazine_1`, you could use this to look for
 * the existence of `magazine_2` in the trait set, ignoring `magazine_1` itself.
 * Can also be used to look for traits without having a given trait -- for example, to look for any `magazine_` traits.
 * 
 * @param {Set<string>} traits The set of traits to look through.
 * @param {string} trait_start The common front part of the trait names, going with the above example, it could be 'magazine_'.
 * @param {string} trait_end The given trait's end part. In the above example, this would be `1`. Can be left empty if we don't
 * @returns True if the a trait could be found that starts similarly to our given trait, but *isn't* our given trait 
 *          (as written above, an example case would be if we found `magazine_2`).
 */
function findSimilarTraits(traits, trait_start, trait_end) {
    for (const trait of traits)
        if (trait.startsWith(trait_start) && (trait_end === undefined || trait.length == 0 || trait !== `${trait_start}${trait_end}`))
            return true;
    return false;
}

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
    },
    blast: {
        label: "warden.traits.weapon.blast.label",
        desc: "warden.traits.weapon.blast.desc",
        dynamic_effects: [
            {
                type: "note",
                label: "Blast",
                domains: new Set(["attack", "strike.attack"]),
                defaultEnabled: true,
                applicable_if: ["attack.trait.blast"],

                modifier_type: "universal",

                mode: "add",
                value: "<p><strong>@Localise[warden.traits.weapon.blast.label]</strong> @Localise[warden.traits.weapon.blast.desc]</p>",
            }
        ]
    },
    breach: {
        label: "warden.traits.weapon.breach.label",
        desc: "warden.traits.weapon.breach.desc",
        dynamic_effects: [
            {
                type: "note",
                label: "Breach",
                domains: new Set(["damage", "strike.damage"]),
                defaultEnabled: true,
                applicable_if: ["damage.trait.breach"],

                modifier_type: "universal",

                mode: "add",
                value: "<p><strong>@Localise[warden.traits.weapon.breach.label]</strong> @Localise[warden.traits.weapon.breach.desc]</p>",
            }
        ]
    },
    break: {
        label: "warden.traits.weapon.break.label",
        desc: "warden.traits.weapon.break.desc",
        dynamic_effects: [], // TODO: Will need implementation if we ever manually implement the various actions.
    },
    concealable: {
        label: "warden.traits.weapon.concealable.label",
        desc: "warden.traits.weapon.concealable.desc",
        dynamic_effects: [], // TODO: Will need implementation if we ever manually implement the various actions.
    },
    disperse: {
        label: "warden.traits.weapon.disperse.label",
        desc: "warden.traits.weapon.disperse.desc",
        dynamic_effects: [],
    },
    dual: {
        label: "warden.traits.weapon.dual.label",
        desc: "warden.traits.weapon.dual.desc",
        dynamic_effects: [], // TODO: I have no idea how we'll handle this.
    },
    explosive_1: {
        label: "warden.traits.weapon.explosive.label_1",
        desc: "warden.traits.weapon.explosive.desc",
        validity_cb: (item) => {
            return !findSimilarTraits(item.traits, "explosive_", "1");
        },
        dynamic_effects: [],
    },
    explosive_2: {
        label: "warden.traits.weapon.explosive.label_2",
        desc: "warden.traits.weapon.explosive.desc",
        validity_cb: (item) => {
            return !findSimilarTraits(item.traits, "explosive_", "2");
        },
        dynamic_effects: [],
    },
    explosive_3: {
        label: "warden.traits.weapon.explosive.label_3",
        desc: "warden.traits.weapon.explosive.desc",
        validity_cb: (item) => {
            return !findSimilarTraits(item.traits, "explosive_", "1");
        },
        dynamic_effects: [],
    },
    fatal: {
        label: "warden.traits.weapon.fatal.label",
        desc: "warden.traits.weapon.fatal.desc",
        validity_cb: (item) => {
            return item.damage_die <= 8;
        },
        dynamic_effects: [
            {
                type: "effect_die_size",
                label: "Fatal",
                domains: new Set(["damage", "strike.damage"]),
                defaultEnabled: true,
                applicable_if: ["damage.trait.fatal", "crit"],

                modifier_type: "universal",

                mode: "add",
                value: 4,
            }
        ],
    },
    forceful: {
        label: "warden.traits.weapon.forceful.label",
        desc: "warden.traits.weapon.forceful.desc",
        dynamic_effects: [
            {
                type: "bonus",
                label: "Forceful",
                domains: new Set(["damage", "strike.damage"]),
                defaultEnabled: true,
                applicable_if: ["damage.trait.forceful", "map"],

                modifier_type: "item",

                mode: "add",
                value: 2,
            }
        ],
    },
    grapple: {
        label: "warden.traits.weapon.grapple.label",
        desc: "warden.traits.weapon.grapple.desc",
        dynamic_effects: [], // TODO: Will need implementation if we ever manually implement the various actions.
    },
    improvised: {
        label: "warden.traits.weapon.improvised.label",
        desc: "warden.traits.weapon.improvised.desc",
        dynamic_effects: [
            {
                type: "penalty",
                label: "Improvised",
                domains: new Set(["attack", "strike.attack"]),
                defaultEnabled: true,
                applicable_if: ["damage.trait.improvised", {"not": "ignore_improvised_penalty"}],

                modifier_type: "universal",

                mode: "add",
                value: 2,
            }
        ]
    },
    loud: {
        label: "warden.traits.weapon.loud.label",
        desc: "warden.traits.weapon.loud.desc",
        dynamic_effects: [
            {
                type: "note",
                label: "Loud",
                domains: new Set(["attack", "strike.attack"]),
                defaultEnabled: true,
                applicable_if: ["attack.trait.loud"],

                modifier_type: "universal",

                mode: "add",
                value: "<p><strong>@Localise[warden.traits.weapon.loud.label]</strong> @Localise[warden.traits.weapon.loud.desc]</p>",
            }
        ],
    },
    magazine_1: {
        label: "warden.traits.weapon.magazine.label_1",
        desc: "warden.traits.weapon.magazine.desc",
        validity_cb: (item) => {
            return item.type === "ranged" && !findSimilarTraits(item.traits, "magazine_", "1");
        },
        dynamic_effects: [], // TODO: Might need a completely unique implementation.
    },
    magazine_2: {
        label: "warden.traits.weapon.magazine.label_2",
        desc: "warden.traits.weapon.magazine.desc",
        validity_cb: (item) => {
            return item.type === "ranged" && !findSimilarTraits(item.traits, "magazine_", "2");
        },
        dynamic_effects: [], // TODO: Might need a completely unique implementation.
    },
    magazine_3: {
        label: "warden.traits.weapon.magazine.label_3",
        desc: "warden.traits.weapon.magazine.desc",
        validity_cb: (item) => {
            return item.type === "ranged" && !findSimilarTraits(item.traits, "magazine_", "3");
        },
        dynamic_effects: [], // TODO: Might need a completely unique implementation.
    },
    manual: {
        label: "warden.traits.weapon.manual.label",
        desc: "warden.traits.weapon.manual.desc",
        validity_cb: (item) => {
            return findSimilarTraits(item.traits, "magazine_");
        },
        dynamic_effects: [], // TODO: See magazine and reload traits, kinda dependent on those.
    },
    massive: {
        label: "warden.traits.weapon.massive.label",
        desc: "warden.traits.weapon.massive.desc",
        validity_cb: (item) => {
            return ["heavy", "huge"].find((x) => x === item.weight) !== undefined;
        },
        dynamic_effects: [
            {
                type: "effect_dice",
                label: "Massive (Weapon Raised)",
                domains: new Set(["damage", "strike.damage"]),
                defaultEnabled: false, // TODO: reconsider when we actually implement Raise a Weapon
                applicable_if: ["damage.trait.massive", "item-raised"], // TODO: reconsider when we actually implement Raise a Weapon
                                                                        // This will basically apply EVERY weapon-raising bonus as it is
                                                                        // Weapon-raising benefits might need to be implemented per-weapon

                modifier_type: "universal",

                mode: "add",
                value: 2,
            }
        ],
    },
    parry: {
        label: "warden.traits.weapon.parry.label",
        desc: "warden.traits.weapon.parry.desc",
        dynamic_effects: [
            {
                type: "bonus",
                label: "Parry (Weapon Raised)",
                domains: new Set(["toughness"]),
                defaultEnabled: false, // TODO: reconsider when we actually implement Raise a Weapon
                applicable_if: ["item.trait.parry", "item-raised"], // TODO: reconsider when we actually implement Raise a Weapon
                                                                    // This will basically apply EVERY weapon-raising bonus as it is
                                                                    // Weapon-raising benefits might need to be implemented per-weapon

                modifier_type: "item",

                mode: "add",
                value: 1,
            },
            {
                type: "bonus",
                label: "Parry (Weapon Parry)",
                domains: new Set(["toughness"]),
                defaultEnabled: false, // TODO: reconsider when we actually implement Raise a Weapon
                applicable_if: ["item.trait.parry", "item-raised", "weapon-parry"], // TODO: reconsider when we actually implement Raise a Weapon
                                                                                    // This will basically apply EVERY weapon-raising bonus as it is
                                                                                    // Weapon-raising benefits might need to be implemented per-weapon

                modifier_type: "item",

                mode: "add",
                value: 3,
            }
        ],
    },
    rapid: {
        label: "warden.traits.weapon.rapid.label",
        desc: "warden.traits.weapon.rapid.desc",
        validity_cb: (item) => {
            return findSimilarTraits(item.traits, "magazine_");
        },
        dynamic_effects: []
    },
    reload_1: {
        label: "warden.traits.weapon.reload.label_1",
        desc: "warden.traits.weapon.reload.desc",
        validity_cb: (item) => {
            return !findSimilarTraits(item.traits, "reload_", "1");
        },
        dynamic_effects: [] // TODO: Might need a completely unique implementation.
    },
    reload_2: {
        label: "warden.traits.weapon.reload.label_2",
        desc: "warden.traits.weapon.reload.desc",
        validity_cb: (item) => {
            return !findSimilarTraits(item.traits, "reload_", "2");
        },
        dynamic_effects: [] // TODO: Might need a completely unique implementation.
    },
    reload_3: {
        label: "warden.traits.weapon.reload.label_3",
        desc: "warden.traits.weapon.reload.desc",
        validity_cb: (item) => {
            return !findSimilarTraits(item.traits, "reload_", "3");
        },
        dynamic_effects: [] // TODO: Might need a completely unique implementation.
    },
    reload_4: {
        label: "warden.traits.weapon.reload.label_4",
        desc: "warden.traits.weapon.reload.desc",
        validity_cb: (item) => {
            return !findSimilarTraits(item.traits, "reload_", "4");
        },
        dynamic_effects: [] // TODO: Might need a completely unique implementation.
    },
    reposition: {
        label: "warden.traits.weapon.reposition.label",
        desc: "warden.traits.weapon.reposition.desc",
        dynamic_effects: [], // TODO: Will need implementation if we ever manually implement the various actions.
    },
    seeking: {
        label: "warden.traits.weapon.seeking.label",
        desc: "warden.traits.weapon.seeking.desc",
        dynamic_effects: [
            {
                type: "bonus",
                label: "Seeking (Aimed)",
                domains: new Set(["attack", "strike.attack"]),
                defaultEnabled: false, // TODO: reconsider when we actually implement Aiming
                applicable_if: ["item.trait.seeking", "aiming"], // TODO: reconsider when we actually implement Aiming

                modifier_type: "item",

                mode: "add",
                value: 3,
            }
        ],
    },
    single_use: {
        label: "warden.traits.weapon.single_use.label",
        desc: "warden.traits.weapon.single_use.desc",
        dynamic_effects: [],
    },
    slow: {
        label: "warden.traits.weapon.slow.label",
        desc: "warden.traits.weapon.slow.desc",
        validity_cb: (item) => {
            return item.type === "melee";
        },
        dynamic_effects: [], // Implemented in the Weapon::runStrike() code.
    },
    stun: {
        label: "warden.traits.weapon.stun.label",
        desc: "warden.traits.weapon.stun.desc",
        dynamic_effects: [
            {
                type: "note",
                label: "Stun",
                domains: new Set(["damage", "strike.damage"]),
                defaultEnabled: true,
                applicable_if: ["damage.trait.stun"],

                modifier_type: "universal",

                mode: "add",
                value: "<p><strong>@Localise[warden.traits.weapon.stun.label]</strong> @Localise[warden.traits.weapon.stun.desc]</p>",
            }
        ]
    },
    sweep: {
        label: "warden.traits.weapon.sweep.label",
        desc: "warden.traits.weapon.sweep.desc",
        dynamic_effects: [
            {
                type: "bonus",
                label: "Sweep",
                domains: new Set(["attack", "strike.attack"]),
                defaultEnabled: true,
                applicable_if: ["attack.trait.sweep", "map"],

                modifier_type: "universal",

                mode: "add",
                value: 1,
            }
        ]
    },
    sundering: {
        label: "warden.traits.weapon.sundering.label",
        desc: "warden.traits.weapon.sundering.desc",
        dynamic_effects: [
            {
                type: "note",
                label: "Sundering",
                domains: new Set(["attack", "strike.attack"]),
                defaultEnabled: true,
                applicable_if: ["attack.trait.sundering"],

                modifier_type: "universal",

                mode: "add",
                value: "<p><strong>@Localise[warden.traits.weapon.sundering.label]</strong> @Localise[warden.traits.weapon.sundering.desc]</p>",
            }
        ],
    },
    tangible: {
        label: "warden.traits.weapon.tangible.label",
        desc: "warden.traits.weapon.tangible.desc",
        validity_cb: (item) => {
            return item.damage_types.some((type) => {
                const typeData = WARDEN.DAMAGE_TYPES[type];

                if (typeData === undefined) return false;
                if (typeData.category === "energy" || typeData.category === "special") return true;

                return false;
            });
        },
        dynamic_effects: [
            {
                type: "note",
                label: "Tangible",
                domains: new Set(["damage", "strike.damage"]),
                defaultEnabled: true,
                applicable_if: ["damage.trait.tangible"],

                modifier_type: "universal",

                mode: "add",
                value: "<p><strong>@Localise[warden.traits.weapon.tangible.label]</strong> @Localise[warden.traits.weapon.tangible.desc]</p>",
            }
        ]
    },
    thrown: {
        label: "warden.traits.weapon.thrown.label",
        desc: "warden.traits.weapon.thrown.desc",
        dynamic_effects: [
            {
                type: "bonus",
                label: "Combat Proficiency (Thrown)",
                domains: new Set(["strike.damage"]),
                applicable_if: ["strike.ranged", "damage.trait.thrown"],
                defaultEnabled: true,

                modifier_type: "proficiency",

                mode: "upgrade",
                value: "@proficiency_rank",
            }
        ],
    },
    trip: {
        label: "warden.traits.weapon.trip.label",
        desc: "warden.traits.weapon.trip.desc",
        dynamic_effects: [], // TODO: Will need implementation if we ever manually implement the various actions.
    },
    two_hand: {
        label: "warden.traits.weapon.two_hand.label",
        desc: "warden.traits.weapon.two_hand.desc",
        validity_cb: (item) => {
            return item.hands === 1 && item.damage_die <= 10;
        },
        dynamic_effects: [
            {
                type: "effect_die_size",
                label: "Two-Hand",
                domains: new Set(["damage", "strike.damage"]),
                defaultEnabled: false,
                applicable_if: ["damage.trait.two_hand"],

                modifier_type: "universal",

                mode: "add",
                value: 2,
            }
        ],
    },
    unarmed: {
        label: "warden.traits.weapon.unarmed.label",
        desc: "warden.traits.weapon.unarmed.desc",
        dynamic_effects: [],
    },
}