module.exports = {
	'extends': [
		'eslint:recommended',
		'google',
	],

	'env': {
		'browser': true,
		'es6': true,
		'serviceworker': true,
		'worker': true,
	},

	'plugins': [
		'html'
	],

	'globals': {
		'require': true,
		'app': true,
		'Background': true,
		'Devices': true,
		'Fb': true,
		'Msg': true,
		'Notify': true,
		'Reg': true,
		'SW': true,
		'User': true,
		'Utils': true,
		'chrome': true,
		'runtime': true,
		'wrap': true,
		'unwrap': true,
		'Polymer': true,
		'Platform': true,
		'gapi': true,
		'linkifyElement': true,
		'self': true,
		'clients': true,
		'firebase': true,
		'moment': true,
		'LZString': true,
		'ServiceWorkerRegistration': true,
		'ChromePromise': true,
	},

	'rules': {
		'linebreak-style': ['off', 'windows'],
		'max-len': ['warn', 160],
		'no-console': 'warn',
		'no-unused-vars': 'warn',
		'no-trailing-spaces': 'off',
		'padded-blocks': 'off',
		'require-jsdoc': 'warn',
		'new-cap': ['error', { 'capIsNewExceptions': ['Polymer'] }],
		'quotes': ['error', 'single'],
		'quote-props': ['error', 'consistent'],
	},
};
