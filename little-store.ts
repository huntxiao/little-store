import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { concatMap, debounceTime, switchMap, take, tap } from 'rxjs/operators';

export default class LittleStore<T> {
  private dataSubject = new BehaviorSubject<T>(null);
  get data$() {
    return this.dataSubject.asObservable();
  }

  private dataPri: T;
  get data() {
    return this.dataPri;
  }
  private isLoadingSubject = new BehaviorSubject(false);
  get isLoading$() {
    return this.isLoadingSubject.asObservable();
  }

  private isLoadingPri: boolean;

  get isLoading() {
    return this.isLoadingPri;
  }
  private errorSubject = new BehaviorSubject(null);
  get error$() {
    return this.errorSubject.asObservable();
  }
  private errorPri: any;

  get error() {
    return this.errorPri;
  }
  private callFnSubject = new Subject<any[]>();
  private defValue: T;
  constructor(fetchFn: (...args) => Observable<T>, params?: {
    switchMap?: boolean,
    debounceTime?: number;
    defaultValue?: T;
  }) {
    const defParams = { switchMap: true };
    params = { ...defParams, ...params };
    let ob$ = this.callFnSubject.asObservable();
    let hasSwitchMap = false,
      def = null;
    if (params) {
      const { switchMap: sw, debounceTime: dt, defaultValue } = params;
      if (dt) {
        ob$ = ob$.pipe(debounceTime(dt));
      }
      if (sw) {
        hasSwitchMap = true;
      }
      if (defaultValue !== void (0)) {
        def = defaultValue;
        this.defValue = def;
        this.setData(defaultValue);
      }
    }
    ob$ = ob$.pipe(tap(() => {
      this.setLoading(true);
      this.setError('');
    }));
    let lastOb$: Observable<T>;
    if (hasSwitchMap) {
      lastOb$ = ob$.pipe(switchMap((args) => fetchFn(...args).pipe(take(1))));
    } else {
      lastOb$ = ob$.pipe(concatMap((args) => fetchFn(...args).pipe(take(1))));
    }
    this.subscribeOb(lastOb$, def);
  }

  private subscribeOb(ob: Observable<T>, rollbackValue: T) {
    const sub = ob.subscribe((res) => {
      this.setData(res);
      this.setLoading(false);
    }, (err) => {
      this.setData(rollbackValue);
      this.setError(err);
      this.setLoading(false);
      sub.unsubscribe();
      this.subscribeOb(ob, rollbackValue);
    });
  }

  private setLoading(res: boolean) {
    this.isLoadingPri = res;
    this.isLoadingSubject.next(res);
  }

  private setData(data: T) {
    this.dataPri = data;
    this.dataSubject.next(data);
  }

  private setError(error) {
    this.errorPri = error;
    this.errorSubject.next(error);
  }

  update(...args) {
    this.callFnSubject.next(Array.from(args));
  }

  reset(params?: { data?: T, error?: any }) {
    const data = params && Object.prototype.hasOwnProperty.call(params, 'data') ? params.data : this.defValue;
    this.setData(data);
    this.setLoading(false);
    this.setError(params && Object.prototype.hasOwnProperty.call(params, 'error') ? params.error : '');
    return this;
  }
}
