const { declare } = require("@babel/helper-plugin-utils");
const types = require("@babel/types");

module.exports = exports = declare(() => {
    function helper() {
        return {
            JSXNamespacedName(path) {
                throw path.buildCodeFrameError("Namespace tags are not supported.");
            },

            JSXSpreadChild(path) {
                throw path.buildCodeFrameError("Spread children are not supported.",);
            },

            JSXElement: {
                exit(path, file) {
                    let callExpr = buildCreateElementCall(path, file);
                    path.replaceWith(types.inherits(callExpr, path.node));
                }
            }
        };

        function convertJSXIdentifier(node) {
            if (types.isJSXIdentifier(node)) {
                if (types.isValidIdentifier(node.name, false))
                    node.type = "Identifier";
                else
                    return types.stringLiteral(node.name);
            }
            else if (types.isJSXMemberExpression(node))
                return types.memberExpression(convertJSXIdentifier(node.object), convertJSXIdentifier(node.property));

            return node;
        }

        function convertAttribute(node) {
            if (types.isJSXSpreadAttribute(node))
                return types.spreadElement(node.argument);

            let value = node.value || types.booleanLiteral(true);
            if (types.isJSXExpressionContainer(value))
                value = value.expression;

            if (types.isStringLiteral(value)) {
                value.value = value.value.replace(/\n\s+/g, " ");
                if (value.extra && value.extra.raw) delete value.extra.raw;
            }

            if (types.isValidIdentifier(node.name.name, false))
                node.name.type = "Identifier";
            else
                node.name = types.stringLiteral(node.name.name);

            return types.inherits(types.objectProperty(node.name, value), node);
        }

        function buildCreateElementCall(path) {
            const openingPath = path.get("openingElement");
            openingPath.parent.children = types.react.buildChildren(openingPath.parent);

            const tagExpr = convertJSXIdentifier(openingPath.node.name);
            const args = [];

            if (types.isLiteral(tagExpr) || /^[a-z]/.test(tagExpr.name))
                args.push(types.stringLiteral(tagExpr.name));
            else
                args.push(tagExpr);

            const props = openingPath.node.attributes.map(attr => convertAttribute(attr));

            args.push(types.objectExpression(props), types.arrayExpression(path.node.children));

            return types.callExpression(types.identifier("_createElement"), args);
        }
    }

    return {
        name: "transform-jsx",
        visitor: helper()
    };
});

exports.default = exports;

