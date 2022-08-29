# Import pandas
import os
import numpy as np
import pandas as pd
from datetime import datetime
from datetime import timezone
from dateutil.relativedelta import relativedelta


df_finjournal = pd.read_csv("./Datasets/Journals/FinancialJournal.csv")
df_finjournal = df_finjournal[(df_finjournal['category'] == 'Wage') | (
    df_finjournal['category'] == 'Shelter') | (df_finjournal['category'] == 'RentAdjustment')]

df_finjournal.sort_values(
    by=['timestamp', 'participantId'], inplace=True, ignore_index=True)

# month of april onwards
#df_finjournal = df_finjournal.iloc[461107:522811]
# print(df_finjournal)


len_df_finjournal = len(df_finjournal.index)
""" fullname = os.path.join(
    './Monthly Data', 'fin_journal_sorted_filtered' + '.csv')
df_finjournal.to_csv(fullname, index=False) """

monthly_wages = np.zeros((1011, 15))  # monthly wage for each participant


def compute_monthly_wages():
    global monthly_wages, df_finjournal
    # starts from March 1st 2022
    current_month_start_time = datetime.fromisoformat(
        '2022-03-01T00:00:00Z'[:-1])
    next_month_start_time = current_month_start_time + \
        relativedelta(months=1)

    month_num = 0
    #month_num = 13
    for fin_index, fin_row in df_finjournal.iterrows():
        fin_d = datetime.fromisoformat(fin_row['timestamp'][:-1])

        if fin_d >= next_month_start_time:
            # increment month
            current_month_start_time = next_month_start_time
            next_month_start_time = current_month_start_time + \
                relativedelta(months=1)
            month_num += 1

        if fin_d >= current_month_start_time and fin_d < next_month_start_time:
            if fin_row['category'] == 'Wage':
                # store participants' wages for the month
                monthly_wages[int(fin_row['participantId']),
                              month_num] += float(fin_row['amount'])


def compute_financial_transactions(fin_index, d, current_aptId, current_jobId, df_jobs, employers_transactions, apartments_transactions):
    global len_df_finjournal, df_finjournal

    while fin_index < len_df_finjournal and datetime.fromisoformat(
            df_finjournal.at[fin_index, 'timestamp'][:-1]) < d:
        # match found - transaction done by a participant at this time
        match df_finjournal.at[fin_index, 'category']:
            case 'Wage':
                id = current_jobId[int(
                    df_finjournal.at[fin_index, 'participantId']), 0]
                val = df_jobs.loc[df_jobs['jobId'] == id, 'employerId'].values[0] if id not in [
                    None, -1] else id
                entry = {
                    'timestamp': df_finjournal.at[fin_index, 'timestamp'],
                    'participantId': df_finjournal.at[fin_index, 'participantId'],
                    'id': val,
                    'amount': df_finjournal.at[fin_index, 'amount']
                }
                employers_transactions.append(entry)
            case 'Shelter' | 'RentAdjustment':
                entry = {
                    'timestamp': df_finjournal.at[fin_index, 'timestamp'],
                    'participantId': df_finjournal.at[fin_index, 'participantId'],
                    'id': current_aptId[int(df_finjournal.at[fin_index, 'participantId']), 0],
                    'amount': df_finjournal.at[fin_index, 'amount']
                }
                apartments_transactions.append(entry)
        fin_index += 1
    return fin_index, employers_transactions, apartments_transactions


def get_time(time):
    t = np.datetime64(time)
    t = t.astype(datetime)
    return t


def write_to_csv(df, directory):
    month_df = pd.DataFrame.from_records(df)
    month_df.to_csv(directory, index=False)


def write_monthly_data():
    global monthly_wages, df_finjournal, len_df_finjournal

    filepath = "./Datasets/Activity Logs/"
    file_csv = "ParticipantStatusLogs"
    format = ".csv"

    df_jobs = pd.read_csv("./Datasets/Attributes/Jobs.csv")

    first_file_index = 1
    last_file_index = 72
    #last_file_index = 3

    # avg monthly financial stability of a person, each index denotes the participant_id
    # Values -> Unknown = 0, Unstable = 1, Stable = 2 => value greater than 1.5 a month is stable
    stability_status = [[] for i in range(1011)]  # array of size 1011

    available_balance = np.full((1011, ), None)
    monthly_extra_budget = np.full((1011, ), None)
    # keeps track of monthly data: None means no data available, -1 means no job,
    jobId = np.full((1011, ), None)
    # keeps track of current data: col 0: daily data, col 1: weekly data
    current_jobId = np.full((1011, 2), None)
    current_aptId = np.full((1011, 2), None)

    # Hours worked by participants on average per day in a month
    daily_avg_worktime = [[] for i in range(1011)]
    # temp start time, end time and break time at work for each participant
    worktime_intervals = [[None for j in range(2)] for i in range(1011)]
    break_time = np.zeros((1011, ))

    # starts from March 1st 2022
    current_month_start_time = datetime.fromisoformat(
        '2022-03-01T00:00:00Z'[:-1])
    next_month_start_time = current_month_start_time + \
        relativedelta(months=1)
    next_week_start_time = current_month_start_time + \
        relativedelta(days=7)
    # relativedelta(months=1)  # 1 month after
    # last day: '2023-05-24T00:00:00Z'. No data for work available on/after this day
    last_day = datetime.fromisoformat('2023-05-24T00:05:00Z'[:-1])

    # initialize iterating variables for the financial journal
    fin_index = 0  # current index on file
    # fin_index = 461107  # current index on file
    employers_transactions = []
    apartments_transactions = []

    # to test whether num rows in df_finjournal matches the rows in csv files
    total_rows_trans = 0

    month_num = 0
    for n in range(first_file_index, last_file_index + 1):
        df_activities = pd.read_csv(filepath + file_csv + str(n) + format)
        df_activities.drop(
            ['currentLocation', 'hungerStatus',
             'sleepStatus', 'dailyFoodBudget'],
            axis=1,
            inplace=True)

        for index, row in df_activities.iterrows():
            d = datetime.fromisoformat(row['timestamp'][:-1])

            # check if current participantid and timestamp is present in df_finjournal
            # while loop instead of if..several transactions possible at the same time
            # WHAT IF: particpant is not there in either?
            # note the jobId and apartmentId of participants during the financial transaction in order to match venues
            """ fin_d = datetime.fromisoformat(
                df_finjournal.at[fin_index, 'timestamp'][:-1])
            while fin_index < len_df_finjournal and not np.isnan(row['participantId']) and \
                    (fin_d < d or (fin_d == d and df_finjournal.at[fin_index, 'participantId'] < int(row['participantId']))):
                # let fin journal catch up with current time
                # maybe fin time or participantId is not there in activitives
                # we have no info on either businessId or apartmentId of transaction
                match df_finjournal.at[fin_index, 'category']:
                    case 'Wage':
                        id = current_jobId[int(
                            df_finjournal.at[fin_index, 'participantId'])]
                        val = df_jobs.loc[df_jobs['jobId'] == id].values[0] if id not in [None, -1] else id
                        entry = {
                            'timestamp': df_finjournal.at[fin_index, 'timestamp'],
                            'participantId': df_finjournal.at[fin_index, 'participantId'],
                            'business': 'Employers',
                            'id': val,
                            'amount': df_finjournal.at[fin_index, 'amount']
                        }
                        employers_transactions.append(entry)
                    case 'Shelter' | 'RentAdjustment':
                        entry = {
                            'timestamp': df_finjournal.at[fin_index, 'timestamp'],
                            'participantId': df_finjournal.at[fin_index, 'participantId'],
                            'business': 'Apartments',
                            'id': current_aptId[int(df_finjournal.at[fin_index, 'participantId'])],
                            'amount': df_finjournal.at[fin_index, 'amount']
                        }
                        apartments_transactions.append(entry)
                fin_index += 1
                fin_d = datetime.fromisoformat(df_finjournal.at[fin_index, 'timestamp'][:-1])

            while fin_index < len_df_finjournal and not np.isnan(row['participantId']) and fin_d == d and \
                    row['participantId'] == df_finjournal.at[fin_index, 'participantId']:
                # match found - transaction done by a participant at this time
                match df_finjournal.at[fin_index, 'category']:
                    case 'Wage':
                        entry = {
                            'timestamp': row['timestamp'],
                            'participantId': row['participantId'],
                            'business': 'Employers',
                            'id': df_jobs.loc[df_jobs['jobId'] == row['jobId'], 'employerId'].values[0],
                            'amount': df_finjournal.at[fin_index, 'amount']
                        }
                        employers_transactions.append(entry)
                    case 'Shelter' | 'RentAdjustment':
                        entry = {
                            'timestamp': row['timestamp'],
                            'participantId': row['participantId'],
                            'business': 'Apartments',
                            'id': -1 if np.isnan(row['apartmentId']) else row['apartmentId'],
                            'amount': df_finjournal.at[fin_index, 'amount']
                        }
                        apartments_transactions.append(entry)
                fin_index += 1
                fin_d = datetime.fromisoformat(df_finjournal.at[fin_index, 'timestamp'][:-1]) """

            # record daily work hours for participants
            # conclude work hours at midnight
            if d.hour == 0 and d.minute == 0 and d.second == 0:
                if d < last_day:  # includes midnight as last_day's time time is 5 minutes into the last date
                    # save duration worked that day for each participant: end time - start time - break time
                    for part_id in range(1011):
                        if worktime_intervals[part_id][0:2] != [None, None]:
                            daily_avg_worktime[part_id].append(
                                ((worktime_intervals[part_id][1]
                                  - worktime_intervals[part_id][0]).total_seconds() - break_time[part_id]) / 3600)
                            # reset values as we loop through
                            worktime_intervals[part_id][0:2] = [None, None]
                    # reset values
                    break_time.fill(0)

                # record all the financial transactions of the day (at midnight)
                fin_index, employers_transactions, apartments_transactions = compute_financial_transactions(
                    fin_index, d, current_aptId, current_jobId, df_jobs, employers_transactions, apartments_transactions)

            # at end of week
            if d >= next_week_start_time and d.date() < datetime.fromisoformat(
                    '2023-05-14').date():
                # at the end of the week, update current_aptId and current_jobId to account for dropped participants
                # copy weekly values from column 1 to column 0 (which will have updated values of participants)
                current_jobId[:, 0] = current_jobId[:, 1]
                current_jobId[:, 1].fill(None)
                current_aptId[:, 0] = current_aptId[:, 1]
                current_aptId[:, 1].fill(None)
                next_week_start_time = next_week_start_time + \
                    relativedelta(days=7)

            # current datetime is past the monthly interval or if second last row in the last file
            if d >= next_month_start_time or \
                    (np.isnan(row['participantId'])):

                # compute next 1011 entries for 1011 participants
                monthly_data = []
                for part_id in range(1011):  # 0-1010 participants, inclusive
                    # financial stability
                    # continue with current row after writing to the file for the month
                    # take avergae of monthlyly financial stability, I don't count Unknown status
                    financial_stability = ''
                    if (len(stability_status[part_id])):
                        financial_stability_val = sum(
                            stability_status[part_id]) / len(
                                stability_status[part_id])
                        if financial_stability_val > 1.5:
                            financial_stability = 'Stable'
                        elif financial_stability_val >= 1 and financial_stability_val <= 1.5:
                            financial_stability = 'Unstable'
                        else:
                            financial_stability = 'Unknown'
                    else:
                        financial_stability = 'Unknown'

                    # avg daily work time for the month = total hours worked/ number of days worked
                    avgDailyWorkTime = -1
                    if (len(daily_avg_worktime[part_id])):
                        avgDailyWorkTime = round(
                            sum(daily_avg_worktime[part_id])/len(daily_avg_worktime[part_id]), 2)

                    # a new object for each participant
                    monthly_data.append({
                        'participantId': part_id,
                        'jobId': jobId[part_id],
                        'financialStatus': financial_stability,
                        'availableBalance': available_balance[part_id],
                        'extraBudget': monthly_extra_budget[part_id],
                        'wage': monthly_wages[part_id, month_num],
                        'avgDailyWorkTime': avgDailyWorkTime
                    })

                    # clear array as it loops
                    daily_avg_worktime[part_id] *= 0
                    stability_status[part_id] *= 0

                # write to csv for that month
                write_to_csv(
                    monthly_data, './Monthly Data/Attributes/Month' + str(month_num) + '.csv')

                if not np.isnan(row['participantId']):
                    write_to_csv(
                        employers_transactions, './Monthly Data/Transactions/Employers/Month' + str(month_num) + '.csv')
                    write_to_csv(apartments_transactions,
                                 './Monthly Data/Transactions/Apartments/Month' + str(month_num) + '.csv')
                    total_rows_trans += len(employers_transactions) + \
                        len(apartments_transactions)
                    employers_transactions *= 0
                    apartments_transactions *= 0

                    month_num += 1

                # reset values
                jobId.fill(None)
                available_balance.fill(None)
                monthly_extra_budget.fill(None)

                # update month interval
                next_month_start_time = next_month_start_time + relativedelta(
                    months=1)

            # continue with current row after writing to the file for the month
            # take avergae of monthly financial stability, I don't count Unknown status
            if np.isnan(row['participantId']):
                break
            
            pid = int(row['participantId'])

            if row['financialStatus'] == 'Stable':
                stability_status[pid].append(2)
            elif row['financialStatus'] == 'Unstable':
                stability_status[pid].append(1)

            # store the most recent jobId: -1 if no jobId, None if no data is available
            if np.isnan(row['jobId']):
                jobId[pid] = -1
                current_jobId[pid, 0] = -1
                current_jobId[pid, 1] = -1
            else:
                jobId[pid] = int(row['jobId'])
                current_jobId[pid, 0] = int(row['jobId'])
                current_jobId[pid, 1] = int(row['jobId'])

            # store the most recent aptId: -1 if no aptId, None if no data is available
            if np.isnan(row['apartmentId']):
                current_aptId[pid, 0] = -1
                current_aptId[pid, 1] = -1
            else:
                current_aptId[pid, 0] = int(row['apartmentId'])
                current_aptId[pid, 1] = int(row['apartmentId'])

            # take the available balance at the end of the month
            available_balance[pid] = row['availableBalance']

            # take the extra budget at the end of the month (increases towards end of week)
            monthly_extra_budget[pid] = row['weeklyExtraBudget']

            if row['currentMode'] == 'AtWork':
                # avg hours worked per day
                if not worktime_intervals[pid][0]:
                    worktime_intervals[pid][0] = d

                # breaks between work:
                # if longer than 5 minutes between intervals, count difference b/w intervals as break time
                if worktime_intervals[pid][1] and (d > worktime_intervals[pid][1] + relativedelta(minutes=5)):
                    break_time[pid] += (d - worktime_intervals[pid]
                                        [1]).total_seconds()
                    # time difference in hours: diff.total_seconds() / 3600
                worktime_intervals[pid][1] = d

    # complete writing financial transactions for the last day which finishes after activity data and (doesn't finish at midnight)
    end_time = datetime.fromisoformat(
        df_finjournal.at[len_df_finjournal-1, 'timestamp'][:-1]) + relativedelta(minutes=5)

    fin_index, employers_transactions, apartments_transactions = compute_financial_transactions(
        fin_index, end_time, current_aptId, current_jobId, df_jobs, employers_transactions, apartments_transactions)

    write_to_csv(
        employers_transactions, './Monthly Data/Transactions/Employers/Month' + str(month_num) + '.csv')
    write_to_csv(apartments_transactions,
                 './Monthly Data/Transactions/Apartments/Month' + str(month_num) + '.csv')
    total_rows_trans += len(employers_transactions) + \
        len(apartments_transactions)
    print('total_rows_trans: ' + str(total_rows_trans))
    print('fin_index: ' + str(fin_index))
    print('len_df_finjournal: ' + str(len_df_finjournal))


if __name__ == '__main__':
    compute_monthly_wages()
    write_monthly_data()
