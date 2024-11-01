const permissions = {
  ADMIN({ can }) {
    can('manage', 'Metrics');
  },
  USER({ can }) {
    can('list', 'Metrics');
  }
};

module.exports = {
  permissions
}