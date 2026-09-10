export async function enrichTextEditor(data, options) {
    if (data.length < 4) return null;
    const [_match, inlineType, paramString, inlineLabel] = data;

    const rawParams = parseInlineParams(paramString, { first: "type" });
    if (!rawParams) return null;
    const type = rawParams.type?.trim();
    if (!type) {
        return null;
    }

    switch (inlineType) {
        case "Localize":
        case "Localise": // Gotta add the proper English option too.
            return inlineLocalise(paramString, options);
        default:
            return null;
    }
}

async function inlineLocalise(paramString, options) {
    const content = game.i18n.localize(paramString);
    if (content === paramString) {
        ui.notifications.error(`Failed to localise ${paramString}!`);
        return null;
    }

    const result = document.createElement("span");
    result.innerHTML = await foundry.applications.ux.TextEditor.enrichHTML(content, options);
    return result; // I mostly just want the localisations resolved, without the extra span. We could change this later though.
}

function parseInlineParams(
    paramString,
    options = {},
) {
    const parts = splitListString(paramString, "|");
    const result = parts.reduce(
        (result, part, idx) => {
            if (idx === 0 && options.first && !part.includes(":")) {
                result[options.first] = part.trim();
                return result;
            }

            const colonIdx = part.indexOf(":");
            const portions = colonIdx >= 0 ? [part.slice(0, colonIdx), part.slice(colonIdx + 1)] : [part, ""];
            result[portions[0]] = portions[1];

            return result;
        },
        {},
    );

    return result;
}

/**
  * Split and sanitize a list in string form. The empty string is always excluded from the resulting array.
  * @param {string} delimiter The delimiter by which to split (default of ",")
  */
export function splitListString(str, delimiter = ",") {
    const list = str
        .split(delimiter)
        .map((el) => el.trim())
        .filter((el) => el !== "");
    return list;
}