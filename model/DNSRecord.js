/** model/DNSRecord.js */
const mongoose = require('mongoose')

// const DNSRecordSchema = new mongoose.Schema({
//     id: mongoose.Schema.ObjectId,
//     domain: { type: String, required: true},
//     type: { type: String, required: true},
//     value: { type: String, required: true},
//     ttl: { type: Number, required: true},
//     ResoureRecords: {
//         Value: [String]
//     },
//     hostedZoneId: {
//         type: String,
//         required: true
//     },
//     priority: Number,
//     wieght: Number,
//     port: Number,
//     target: String,
//     keyTag: Number,
//     algorithm: Number,
//     digestType: Number,
//     digest: String,
// })
const DNSRecordSchema = new mongoose.Schema({
    hostedZoneId: {
        type: String,
        required: true,
    },
    domain: String,
    type: String,
    ttl: Number,    
    priority: Number,
    weight: Number,
    port: Number,
    target: String,
    keyTag: Number,
    algorithm: Number,
    digestType: Number,
    digest: String,
    value: String,
    ResourceRecords: {
        Value: [String]
    }
})

const modal = mongoose.model("dnsrecord", DNSRecordSchema);


module.exports = modal;