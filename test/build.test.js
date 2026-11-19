// Tests for js/exchange_data.js build() using a small hand-written dataset.
// These do not depend on the bundled json/ data.

const test=require("node:test")
const assert=require("node:assert/strict")

const exchange_data=require("../js/exchange_data.js")

// minimal yearly index helpers, independent of js/exchange_year.js
let make_base=function(rawdata)
{
	let base={}
	base.date_to_idx=function(date)
	{
		let m=/(\d{4})/.exec(date||"")
		return m ? Number(m[1])-2000 : 99
	}
	base.idx_to_date=function(idx)
	{
		return String(2000+idx)
	}
	exchange_data.build(base,rawdata)
	return base
}

let fixture=function()
{
	return {
		"2001":{ USD:1, GBP:0.5 },
		"2003":{ USD:1, GBP:0.8, EUR:2 },
		"2004":{ USD:1, EUR:4 },
	}
}

test("min_idx and max_idx bracket the data with an empty sentinel slot",function()
{
	let base=make_base(fixture())
	assert.equal(base.min_idx,0) // one below the first date (2001)
	assert.equal(base.max_idx,4)
	assert.deepEqual(base.data[base.min_idx],{})
})

test("the slot before min_idx holds the oldest value of every currency",function()
{
	let base=make_base(fixture())
	assert.deepEqual(base.data[base.min_idx-1],{ USD:1, GBP:0.5, EUR:2 })
})

test("gaps are forward filled with the latest known value",function()
{
	let base=make_base(fixture())
	assert.deepEqual(base.data[2],{ USD:1, GBP:0.5 }) // 2002 is missing, copies 2001
	assert.deepEqual(base.data[4],{ USD:1, GBP:0.8, EUR:4 }) // GBP carried forward from 2003
})

test("by_date converts through USD",function()
{
	let base=make_base(fixture())
	assert.equal(base.by_date(10,"GBP","USD","2003"),12.5)
	assert.equal(base.by_date(10,"USD","EUR","2003"),20)
	assert.equal(base.by_date(10,"GBP","EUR","2003"),25)
})

test("by_date upper-cases codes and defaults missing currencies to USD",function()
{
	let base=make_base(fixture())
	assert.equal(base.by_date(10,"gbp","usd","2003"),12.5)
	assert.equal(base.by_date(10,"GBP",undefined,"2003"),12.5)
	assert.equal(base.by_date(10,undefined,"EUR","2003"),20)
})

test("by_date treats a missing or invalid value as 0",function()
{
	let base=make_base(fixture())
	assert.equal(base.by_date(undefined,"GBP","USD","2003"),0)
	assert.equal(base.by_date("abc","GBP","USD","2003"),0)
	assert.equal(base.by_date("10","GBP","USD","2003"),12.5)
})

test("by_date returns undefined for an unknown currency or a date with no slot",function()
{
	let base=make_base(fixture())
	assert.equal(base.by_date(10,"XXX","USD","2003"),undefined)
	assert.equal(base.by_date(10,"EUR","USD","2001"),undefined) // EUR not known yet
	assert.equal(base.by_date(10,"GBP","USD","2050"),undefined) // outside the data, not clamped
})

test("by_date returns undefined in the empty sentinel slot",function()
{
	let base=make_base(fixture())
	assert.equal(base.by_date(10,"GBP","USD",base.idx_to_date(base.min_idx)),undefined)
})

test("clamp_date keeps dates within min_idx and max_idx",function()
{
	let base=make_base(fixture())
	assert.equal(base.clamp_date("1990"),"2000") // min_idx, the empty slot
	assert.equal(base.clamp_date("2002"),"2002")
	assert.equal(base.clamp_date("2050"),"2004")
})
