// Characterisation tests: the values day.js, month.js and year.js return
// with the bundled json/ data as of 2026-10-15. They pin current behaviour
// so the code can be refactored safely. Replace them with fixture data when
// the bundled data is removed.

const test=require("node:test")
const assert=require("node:assert/strict")

const day=require("../day.js")
const month=require("../month.js")
const year=require("../year.js")

const exchange_day=require("../js/exchange_day.js")
const exchange_month=require("../js/exchange_month.js")
const exchange_year=require("../js/exchange_year.js")

// Compare to ~12 significant figures rather than exactly, so a refactor that
// reorders the floating point maths (e.g. value*tx/fx vs value*(tx/fx)) does
// not fail, while any real change in rate still does. The type check gives a
// clear message when by_date returns undefined.
let near=function(actual,expected)
{
	assert.equal(typeof actual,"number",`expected a number, got ${actual}`)
	assert.ok(Math.abs(actual-expected)<=Math.abs(expected)*1e-12,`${actual} is not ${expected}`)
}

test("the date string length picks the starting resolution",function()
{
	near(day.by_date(100,"GBP","USD","2010"),154.45807222312024) // year
	near(day.by_date(100,"GBP","USD","2010-01"),161.69817378945734) // month
	near(day.by_date(100,"GBP","USD","2010-01-15"),162.88044881064556) // day
})

test("month.js starts at month at most, year.js always uses year",function()
{
	near(month.by_date(100,"GBP","USD","2010-01-15"),161.69817378945734)
	near(month.by_date(100,"GBP","USD","2010"),154.45807222312024)
	near(year.by_date(100,"GBP","USD","2010-01-15"),154.45807222312024)
})

test("the value D-Portal's import tests rely on",function()
{
	near(month.by_date(1000,"EUR","USD","2012-01"),1291.3494070221277)
	near(day.by_date(1000,"EUR","USD","2012-01-01"),1293.8999999999999)
})

test("days without their own rate use the last known daily rate",function()
{
	assert.equal(day.by_date(100,"GBP","USD","2010-01-16"),day.by_date(100,"GBP","USD","2010-01-15"))
})

test("day falls back to month when a currency has no daily data yet",function()
{
	assert.equal(exchange_day.by_date(1,"USD","TRL","2000-06-15"),undefined)
	near(day.by_date(1,"USD","TRL","2000-06-15"),0.6158698)
})

test("month falls back to year when a currency has no monthly data",function()
{
	assert.equal(exchange_day.by_date(1,"USD","HTG","2010-06-15"),undefined)
	assert.equal(exchange_month.by_date(1,"USD","HTG","2010-06"),undefined)
	near(day.by_date(1,"USD","HTG","2010-06-15"),39.05557)
})

test("dates before a currency's first rate use its oldest known yearly rate",function()
{
	let oldest=279.8502512505368 // GBP's first rate is in 1957
	// before the data starts: clamped onto the empty slot
	near(day.by_date(100,"GBP","USD","1930"),oldest)
	near(day.by_date(100,"GBP","USD","1930-01-01"),oldest)
	// inside the data range, but before GBP has a rate
	assert.equal(exchange_year.by_date(100,"GBP","USD","1940"),undefined)
	near(day.by_date(100,"GBP","USD","1940"),oldest)
	// the first year with a rate gives the same value without the fallback
	near(exchange_year.by_date(100,"GBP","USD","1957"),oldest)
})

test("dates after the data and a missing date use the latest values",function()
{
	let latest=day.by_date(100,"GBP","USD","2099-01-01")
	assert.equal(typeof latest,"number")
	assert.equal(day.by_date(100,"GBP","USD","2099"),latest)
	assert.equal(day.by_date(100,"GBP","USD"),latest)
	assert.equal(month.by_date(100,"GBP","USD"),latest)
	assert.equal(year.by_date(100,"GBP","USD"),latest)
})

test("unknown currencies return undefined at every resolution",function()
{
	assert.equal(day.by_date(100,"XXX","USD","2010-01-15"),undefined)
	assert.equal(month.by_date(100,"XXX","USD","2010-01"),undefined)
	assert.equal(year.by_date(100,"XXX","USD","2010"),undefined)
})

test("codes are case-insensitive and missing currencies mean USD",function()
{
	near(day.by_date(100,"gbp","usd","2010"),154.45807222312024)
	near(day.by_date(100,"GBP",undefined,"2010"),154.45807222312024)
	near(day.by_date(100,undefined,"GBP","2010"),100*100/154.45807222312024)
	assert.equal(day.by_date(undefined,"GBP","USD","2010"),0)
})

test("bundled data contains only valid past dates",{todo:"day data has keys 'undefined' (from fred.json) and 2027-03-31 (from cfiati.json); month and year data have the truncated 'undefin' and 'unde'"},function()
{
	let checks=[
		["day",/^\d{4}-\d{2}-\d{2}$/],
		["month",/^\d{4}-\d{2}$/],
		["year",/^\d{4}$/],
	]
	let today=new Date().toISOString().slice(0,10)
	for(let [name,pattern] of checks)
	{
		let data=require(`../json/usd_to_xxx_by_${name}.json`)
		for(let date in data)
		{
			assert.match(date,pattern,`${name}: ${date}`)
			assert.ok(date<=today.slice(0,date.length),`${name}: ${date} is in the future`)
		}
	}
})
