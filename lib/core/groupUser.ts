import user from "../interface/user";
export class privateUser implements user {
  qq: number;
  constructor(qq: number) {
    this.qq = qq;
  }
}
