export function compileExpression(expr: string): ((x: number, t: number) => number) | null {
  if (!expr || expr.trim() === '') return null;
  try {
    // Replace ^ with ** for exponentiation
    // Replace pi/e with PI/E (case insensitive)
    let parsedExpr = expr
      .replace(/\^/g, '**')
      .replace(/\bpi\b/gi, 'PI')
      .replace(/\be\b/gi, 'E');

    const mathProps = Object.getOwnPropertyNames(Math);
    const args = ['x', 't', ...mathProps];
    // Create a function that takes x, t and all Math properties as arguments
    const fn = new Function(...args, `"use strict"; return ${parsedExpr};`);
    const mathValues = mathProps.map(p => (Math as any)[p]);

    // Test evaluation at x=0, t=0 to catch syntax errors or undefined variables
    const testResult = fn(0, 0, ...mathValues);
    // We allow NaN as a valid return type now (e.g., asin(2) is NaN, which is mathematically correct)
    if (typeof testResult !== 'number') {
      return null;
    }

    return (x: number, t: number) => {
      try {
        const res = fn(x, t, ...mathValues);
        return typeof res === 'number' ? res : NaN;
      } catch (e) {
        return NaN;
      }
    };
  } catch (err) {
    return null;
  }
}
