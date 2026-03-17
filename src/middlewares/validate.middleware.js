export const validate = (schema, target = 'body') => (req, _res, next) => {
  req[target] = schema.parse(req[target]);
  next();
};
