export class Common {

    public static IsValidateMySqlConnectionString(connectionString: string) {
        const regex = /^mysql:\/\/(?<username>[^:]+)(:(?<password>[^@]+))?@(?<host>[^:\/]+)(:(?<port>\d{1,5}))?(\/(?<database>[^?]+))?(?<options>\?.+)?$/;
        return regex.test(connectionString);
    }

}