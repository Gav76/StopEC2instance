'use strict';

// Tag instances with StopGroup=StopEC2instances to have them auto stopped

// module dependencies
var AWS = require('aws-sdk');
var pify = require('pify');
var Promise = require('pinkie-promise');

var ec2 = new AWS.EC2();


exports.handler = function (event, context) {
	var describeParams = {
		Filters: [
			{
				Name: 'tag:StopGroup',
				Values: [
					context.functionName
				]
			}
		]
	};

	// Describe the instances
	pify(ec2.describeInstances.bind(ec2), Promise)(describeParams)
		.then(function (data) {
			var stopParams = {
				InstanceIds: []
			};

			data.Reservations.forEach(function (reservation) {
				reservation.Instances.forEach(function (instance) {
					if (instance.State.Code === 16) {
						// 0: pending, 16: running, 32: shutting-down, 48: terminated, 64: stopping, 80: stopped
						stopParams.InstanceIds.push(instance.InstanceId);
					}
				});
			});

			if (stopParams.InstanceIds.length > 0) {
				// Stop the instances
				return pify(ec2.stopInstances.bind(ec2), Promise)(stopParams);
			}
		})
		.then(context.succeed)
		.catch(context.fail);
};
