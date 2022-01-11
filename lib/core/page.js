"use strict";
module.exports = class page {
  constructor(nameSpace, pageName, run) {
    this.pages;
    this.fatherName;
    this.pageName = pageName;
    this.titel = pageName;
    this.run = run;
    this.subPage = new Map();
    this.data;
    this.nameSpace = nameSpace;
  }
  addSubPage(page) {
    page.fatherName = this.fatherName + "." + this.pageName;
    this.subPage.set(this.nameSpace + "." + this.pageName, page);
  }
};
