/**
 * rotate SVG element
 * @paramVal svgNode that being rotating
 * @paramVal centerX
 * @paramVal centerY
 * @paramVal angle
 */
export function rotateSVG(svgNode, centerX, centerY, angle) {
    var rotationTransform = svgNode.createSVGTransform();
    rotationTransform.setRotate(angle, centerX, centerY);
    svgNode.transform.baseVal.appendItem(rotationTransform);
}