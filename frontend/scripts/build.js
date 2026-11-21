// Ensure CI is explicitly false so react-scripts does not fail builds on warnings
process.env.CI = 'false';
require('react-scripts/scripts/build');
