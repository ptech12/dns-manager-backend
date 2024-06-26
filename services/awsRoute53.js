const {
  Route53Client,
  ChangeResourceRecordSetsCommand,
  CreateHostedZoneCommand,
  ListHostedZonesByNameCommand,
  ListHostedZonesCommand,
} = require("@aws-sdk/client-route-53");

exports.client = new Route53Client({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

exports.prepareRecord = (record) => {
  let resourceRecords;
  let recordName = `${record.domain}`;

  if (record.type === "MX") {
    resourceRecords = [{ Value: `${record.priority} ${record.value}` }];
  } else if (record.type === "SRV") {
    resourceRecords = [
      {
        Value: `${record.priority} ${record.weight} ${record.port} ${record.target}`,
      },
    ];
  } else if (record.type === "DS") {
    resourceRecords = [
      {
        Value: `${record.keyTag} ${record.algorithm} ${record.digestType} ${record.digest}`,
      },
    ];
  } else if (record.type === "PTR" || record.type === "NS") {
    recordName = record.value;
    resourceRecords = [{ Value: record.value }];
  } else if (record.type === "TXT") {
    resourceRecords = [{ Value: `"${record.value}"` }];
  } else {
    resourceRecords = [{ Value: record.value }];
  }

  return { resourceRecords, recordName };
};

exports.createRoute53Record = async (recordParams) => {
  const { resourceRecords, recordName } = this.prepareRecord(recordParams);

  const params = {
    HostedZoneId: recordParams.HostedZoneId,
    ChangeBatch: {
      Changes: [
        {
          Action: "CREATE",
          ResourceRecordSet: {
            Name: recordName,
            Type: recordParams.type,
            TTL: parseInt(recordParams.ttl),
            ResourceRecords: resourceRecords,
          },
        },
      ],
    },
  };

  const command = new ChangeResourceRecordSetsCommand(params);
  try {
    const resp = await this.client.send(command);
    console.log('crr 68',resp);
    return resp;
  } catch (error) {
    console.log('crr 68', error);
    return {
      status: 400,
      message: error.message
    }

  }

};

exports.deleteRoute53Record = async (record) => {
  console.log(record);
  const { resourceRecords, recordName } = this.prepareRecord(record);

  const hostedZoneId = await this.getHostedZoneId(recordName, 1);

  if(hostedZoneId.status === "error"){
    console.log(hostedZoneId.message);
    return {
      status: false,
      message: hostedZoneId.message
    }
  }

  const params = {
    HostedZoneId: hostedZoneId,
    ChangeBatch: {
      Changes: [
        {
          Action: "DELETE",
          ResourceRecordSet: {
            Name: recordName,
            Type: record.type,
            TTL: parseInt(record.ttl),
            ResourceRecords: resourceRecords,
          },
        },
      ],
    },
  };

  const command = new ChangeResourceRecordSetsCommand(params);
  return await this.client.send(command);

};

exports.updateRoute53Record = async (record, hostedZoneId) => {
  const { resourceRecords, recordName } = this.prepareRecord(record);

  console.log('120 aws update', resourceRecords, recordName, record);

  const params = {
    HostedZoneId: hostedZoneId,
    ChangeBatch: {
      Changes: [
        {
          Action: "UPSERT",
          ResourceRecordSet: {
            Name: recordName,
            Type: record.type,
            TTL: parseInt(record.ttl),
            ResourceRecords: resourceRecords,
          },
        },
      ],
    },
  };
  const command = new ChangeResourceRecordSetsCommand(params);

  console.log('param 137', command);
  try{
    const resp = await this.client.send(command);
    console.log('resp 138', resp);
    return resp;
  }catch(err){
    console.log('err 143', err);
    return err
  }
};

exports.createRoute53BulkRecord = async (records, hostedZoneId) => {

  const changes = records.records.map((record) => {

    const { resourceRecords, recordName } = this.prepareRecord(record);
    
    return {
      Action: "CREATE",
      ResourceRecordSet: {
        Name: recordName,
        Type: record.type,
        TTL: parseInt(record.ttl),
        ResourceRecords: resourceRecords,
      },
    };

  });

  const params = {
    HostedZoneId: hostedZoneId,
    ChangeBatch: {
      Changes: changes,
    },
  };

  const command = new ChangeResourceRecordSetsCommand(params);
  console.log(command);

  try {
    const response = await this.client.send(command);
    console.log('createRoute53RecordFromId', response);

    return {
      status: response.status,
      message: response.message
    };
  
    } catch (error) {
      console.log('createRoute53RecordBulk 188: ', error);
      return {
        status: error.status,
        message: error.message
      }
    }
};

exports.getHostedZoneId = async (dnsName, maxItems) => {
  const params = {
    DNSName: dnsName,
    MaxItems: maxItems,
  };

  try {
    const command = new ListHostedZonesByNameCommand(params);
    console.log('cmd 179', command);
    const response = await this.client.send(command);
    console.log('AWSCLIENT',response);
    if (
      response.HostedZones.length > 0 &&
      response.HostedZones[0].Name === `${dnsName}.`
    ) {
      return response.HostedZones[0].Id.split("/").pop();
    } else {
      throw new Error(`No hosted zone found with the DNS name: ${dnsName}`);
    }
  } catch (error) {
    console.error(error);
    return {
      status: "error",
      message: error.message
    }
  }
};



exports.createHostedZone = async (hostedZoneData) => {
  const {
    name,
    // vpcId,
    // vpcRegion,
    // callerReference,

    delegationSetId,
  } = hostedZoneData;

  const params = {
    Name: name,
    // VPC: {
    //   VPCRegion: vpcRegion,
    //   VPCId: vpcId,
    // },
    CallerReference: new Date().getTime().toString(),
    DelegationSetId: delegationSetId,
  };
  const command = new CreateHostedZoneCommand(params);

  return await this.client.send(command);
};

exports.createHostedZoneForClient = async (hostedZoneData) => {

  try {
    const hostedZone = await this.createHostedZone(hostedZoneData)

    const hostedZoneId = hostedZone.HostedZone.Id.split("/").pop();

    return hostedZoneId;

  } catch (error) {
    console.log('achzfc 228', error);
    return error.message
    
  }

}
exports.createRoute53RecordFromId = async (hostedZoneId, recordData) => {

  // check for hosted zone
  try {
    const recordParams = {
      ...recordData,
      HostedZoneId: hostedZoneId,
    }

    // send to AWS 
  const response = await this.createRoute53Record(recordParams);
  
  console.log('createRoute53RecordFromId', response);

  return {
    status: 'success',
    message: response.message,
    code: '200'
  };

  } catch (error) {
    console.log('createRoute53RecordFromId 234: ', error);
    return {
      status: 'failed',
      code: 400,
      message: error.message
    }
  }
}

exports.createHostedZoneAndRecord = async (hostedZoneData, recordData) => {

  const hostedZone = await this.createHostedZone(hostedZoneData);

  const hostedZoneId = hostedZone.HostedZone.Id.split("/").pop();

  const recordParams = {
    ...recordData,
    HostedZoneId: hostedZoneId,
  };

  const response = await this.createRoute53Record(recordParams);

  return {
    response: response,
    hostedZoneId: hostedZoneId
  }
};
