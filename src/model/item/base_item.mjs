const { TypedObjectField, ObjectField } = foundry.data.fields;
const { TypeDataModel } = foundry.abstract;

/**
 * The base object for all items that contains the schema for written dynamic effects
 */
export class BaseItem extends TypeDataModel {
	static defineSchema() {
		return {
			dynamic_effects: new TypedObjectField(
				new ObjectField({ nullable: false }),
				{ required: true },
			),
		};
	}

	// TODO: Consider caching this and just yielding the cache. But there'd need to be a really good invalidator.
	*getDynamicEffects() {
		yield* Object.values(this.dynamic_effects);
	}
}
