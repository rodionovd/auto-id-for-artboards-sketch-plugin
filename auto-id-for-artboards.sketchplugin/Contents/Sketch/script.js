const util = require('util')

var onDocumentChanged = function (context) {
    util.toArray(context.actionContext).forEach(c => {
        if (c.object().isKindOfClass(NSClassFromString("MSArtboardGroup")) == false) {
            return;
        }
        // See https://developer.sketch.com/plugins/document-changes for details on change types
        const artboard = c.object()
        if (c.type() == 3 && !c.isMove()) {
            // a new artboard has been added
            return assignRandomIDToArtboard(artboard);
        }
        if (c.type() == 1 && c.propertyName() == "name") {
            // an artboard has been renamed
            return restoreIDNamePrefixForArtboardIfNeeded(artboard);
        }
    });
}

// ------------------
// MARK: - Operations
// ------------------

function stripExistingIDFromArtboardIfAny(artboard) {
    const uuid = artboardIDFromUserInfo(artboard);
    if (!uuid) {
        return;
    }
    const prefix = namePrefixForID(uuid);
    if (artboard.name().startsWith(prefix)) {
       artboard.name = artboard.name().slice(prefix.length) 
    }
    saveArtboardIDInUserInfo(artboard, null);
}

function assignRandomIDToArtboard(artboard) {
    // in case we're dealing with a duplicate of an existing artboard
    stripExistingIDFromArtboardIfAny(artboard);
    const uuid = generateUniqueIDForArtboard(artboard);
    artboard.name = namePrefixForID(uuid) + artboard.name();
    saveArtboardIDInUserInfo(artboard, uuid);
}

function restoreIDNamePrefixForArtboardIfNeeded(artboard) {
    const uuid = artboardIDFromUserInfo(artboard);
    const expectedPrefix = namePrefixForID(uuid);
    // we trim the prefix to avoid re-installing it just because the trailing whitespace is deleted
    if (uuid && !artboard.name().startsWith(expectedPrefix.trim())) {
        artboard.name = expectedPrefix + artboard.name()
    }
}

// ------------------
// MARK: - Utils
// ------------------

function generateUniqueIDForArtboard(artboard) {
    // TODO: <rodionovd> this is not a unique ID by any means, but it's human-readable for illustrative purposes
    return "ABC-" + artboard.objectID().slice(0, 6);
}

function namePrefixForID(uuid) {
    return `[${uuid}] `
}

/** 
 * @param {object} artboard
 * @returns {string?}
 */
function artboardIDFromUserInfo(artboard) {
    return (artboard.userInfo() ?? {})["exposed.internals.auto-id-for-artboards.uuid"];
}

/** 
 * @param {object} artboard
 * @param {string?} uuid
 */
function saveArtboardIDInUserInfo(artboard, uuid) {
    let userInfo = NSMutableDictionary.dictionaryWithDictionary(artboard.userInfo() ?? {});
    if (uuid) {
        userInfo.setValue_forKey(uuid, "exposed.internals.auto-id-for-artboards.uuid");
    } else {
        userInfo.removeObjectForKey("exposed.internals.auto-id-for-artboards.uuid");
    }
    artboard.setUserInfo(userInfo);
}
